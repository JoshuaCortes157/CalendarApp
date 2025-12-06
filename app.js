let currentUser = null
let users = []
let calendars = []
let events = []
let currentDate = new Date()
let currentFilter = "all"

document.addEventListener("DOMContentLoaded", () => {
  loadFromLocalStorage()
  setupEventListeners()

  if (currentUser) {
    showApp()
  } else {
    showAuth()
  }
})

function setupEventListeners() {
  document.getElementById("authForm").addEventListener("submit", handleAuth)
  document.getElementById("eventForm").addEventListener("submit", handleEventSubmit)
  document.getElementById("createCalendarForm").addEventListener("submit", handleCreateCalendar)

  document.getElementById("eventRecurring").addEventListener("change", (e) => {
    document.getElementById("recurringOptions").style.display = e.target.checked ? "block" : "none"
  })

  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("filter-btn")) {
      document.querySelectorAll(".filter-btn").forEach((btn) => btn.classList.remove("active"))
      e.target.classList.add("active")
      currentFilter = e.target.dataset.filter
      renderCalendar()
    }
  })

  document.getElementById("toggleOverdueModal").addEventListener("click", toggleOverdueModal)
}

function handleAuth(e) {
  e.preventDefault()

  const email = document.getElementById("authEmail").value
  const password = document.getElementById("authPassword").value

  let user = users.find((u) => u.email === email)

  if (!user) {
    user = {
      id: generateId(),
      email: email,
      password: password,
      createdAt: new Date().toISOString(),
    }
    users.push(user)

    const personalCalendar = {
      id: generateId(),
      name: "Personal",
      type: "personal",
      ownerId: user.id,
      members: [user.id],
      createdAt: new Date().toISOString(),
    }
    calendars.push(personalCalendar)
  } else {
    if (user.password === "temp") {
      user.password = password

      const hasPersonalCalendar = calendars.some((c) => c.type === "personal" && c.ownerId === user.id)
      if (!hasPersonalCalendar) {
        const personalCalendar = {
          id: generateId(),
          name: "Personal",
          type: "personal",
          ownerId: user.id,
          members: [user.id],
          createdAt: new Date().toISOString(),
        }
        calendars.push(personalCalendar)
      }
    } else if (user.password !== password) {
      alert("Incorrect password. Please try again.")
      return
    }
  }

  currentUser = user
  saveToLocalStorage()
  showApp()
}

function logout() {
  currentUser = null
  saveToLocalStorage()
  showAuth()
}

function showAuth() {
  document.getElementById("authScreen").style.display = "flex"
  document.getElementById("appContainer").style.display = "none"
}

function showApp() {
  document.getElementById("authScreen").style.display = "none"
  document.getElementById("appContainer").style.display = "flex"

  document.getElementById("userEmail").textContent = currentUser.email
  document.getElementById("userAvatar").textContent = currentUser.email[0].toUpperCase()

  renderCalendarFilters()
  renderCalendar()
  renderProductivityChart()
  updateOverdueNotifications()
}

function renderCalendar() {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  document.getElementById("monthYear").textContent = new Date(year, month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  const grid = document.getElementById("calendarGrid")
  grid.innerHTML = ""

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  days.forEach((day) => {
    const header = document.createElement("div")
    header.className = "day-header"
    header.textContent = day
    grid.appendChild(header)
  })

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement("div")
    emptyCell.className = "day-cell"
    grid.appendChild(emptyCell)
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement("div")
    cell.className = "day-cell"

    const dayNumber = document.createElement("div")
    dayNumber.className = "day-number"
    dayNumber.textContent = day
    cell.appendChild(dayNumber)

    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`

    const dayEvents = getEventsForDate(dateStr)

    dayEvents.forEach((event) => {
      const eventEl = createEventElement(event)
      cell.appendChild(eventEl)
    })

    cell.addEventListener("click", (e) => {
      if (e.target === cell || e.target === dayNumber) {
        openEventModal(dateStr)
      }
    })

    grid.appendChild(cell)
  }
}

function createEventElement(event) {
  const eventEl = document.createElement("div")
  eventEl.className = "event-item"

  eventEl.style.background = "#f1f5f9"
  eventEl.style.borderLeftColor = "#3b82f6"

  if (event.status === "done") {
    eventEl.classList.add("completed")
  }
  if (event.canceled) {
    eventEl.classList.add("canceled")
  }

  const statusIcons = {
    "not-started": "⭕",
    "in-progress": "🔄",
    done: "✅",
  }

  let content = `<span class="status-icon">${statusIcons[event.status] || "⭕"}</span>`
  content += `${event.title}`

  if (event.priority === "urgent") {
    content += '<span class="priority-badge priority-urgent">Urgent</span>'
  }

  if (event.canceled) {
    content += '<span class="priority-badge" style="background: #f1f5f9; color: #64748b;">CANCELED</span>'
  }

  const calendar = calendars.find((c) => c.id === event.calendarId)
  const creator = users.find((u) => u.id === event.createdBy)
  if (calendar && calendar.type === "group" && creator) {
    content += `<div class="event-creator">by ${creator.email.split("@")[0]}</div>`
  }

  eventEl.innerHTML = content

  eventEl.addEventListener("click", (e) => {
    e.stopPropagation()
    openEventModal(null, event)
  })

  return eventEl
}

function getEventsForDate(dateStr) {
  const filteredEvents = events.filter((event) => {
    if (event.date !== dateStr) {
      if (event.recurring) {
        if (!isRecurringEventOnDate(event, dateStr)) {
          return false
        }
      } else {
        return false
      }
    }

    if (currentFilter === "all") {
      return true
    } else if (currentFilter === "personal") {
      const calendar = calendars.find((c) => c.id === event.calendarId)
      return calendar && calendar.type === "personal"
    } else {
      return event.calendarId === currentFilter
    }
  })

  return filteredEvents
}

function isRecurringEventOnDate(event, dateStr) {
  const eventDate = new Date(event.date)
  const checkDate = new Date(dateStr)

  if (checkDate < eventDate) return false

  const daysDiff = Math.floor((checkDate - eventDate) / (1000 * 60 * 60 * 24))

  switch (event.recurrence) {
    case "daily":
      return true
    case "weekly":
      return daysDiff % 7 === 0
    case "monthly":
      return eventDate.getDate() === checkDate.getDate()
    default:
      return false
  }
}

function openEventModal(date = null, event = null) {
  const modal = document.getElementById("eventModal")
  const form = document.getElementById("eventForm")

  form.reset()

  if (event) {
    document.getElementById("modalTitle").textContent = "Edit Event"
    document.getElementById("eventId").value = event.id
    document.getElementById("eventTitle").value = event.title
    document.getElementById("eventDate").value = event.date
    document.getElementById("eventTime").value = event.time
    document.getElementById("eventCalendar").value = event.calendarId
    document.getElementById("eventPriority").value = event.priority
    document.getElementById("eventStatus").value = event.status
    document.getElementById("eventDescription").value = event.description || ""
    document.getElementById("eventRecurring").checked = event.recurring || false
    document.getElementById("eventRecurrence").value = event.recurrence || "weekly"
    document.getElementById("recurringOptions").style.display = event.recurring ? "block" : "none"

    document.getElementById("deleteEventBtn").style.display = "inline-block"
    document.getElementById("cancelEventBtn").style.display = "inline-block"
  } else {
    document.getElementById("modalTitle").textContent = "Add Event"
    document.getElementById("eventId").value = ""
    if (date) {
      document.getElementById("eventDate").value = date
    }

    document.getElementById("deleteEventBtn").style.display = "none"
    document.getElementById("cancelEventBtn").style.display = "none"
  }

  updateCalendarDropdown()

  modal.classList.add("active")
}

function closeEventModal() {
  document.getElementById("eventModal").classList.remove("active")
}

function handleEventSubmit(e) {
  e.preventDefault()

  const eventId = document.getElementById("eventId").value

  const eventData = {
    title: document.getElementById("eventTitle").value,
    date: document.getElementById("eventDate").value,
    time: document.getElementById("eventTime").value,
    calendarId: document.getElementById("eventCalendar").value,
    priority: document.getElementById("eventPriority").value,
    status: document.getElementById("eventStatus").value,
    description: document.getElementById("eventDescription").value,
    recurring: document.getElementById("eventRecurring").checked,
    recurrence: document.getElementById("eventRecurrence").value,
    createdBy: currentUser.id,
  }

  if (eventId) {
    const eventIndex = events.findIndex((e) => e.id === eventId)
    if (eventIndex !== -1) {
      events[eventIndex] = { ...events[eventIndex], ...eventData }
    }
  } else {
    const newEvent = {
      id: generateId(),
      ...eventData,
      canceled: false,
      createdAt: new Date().toISOString(),
    }
    events.push(newEvent)
  }

  saveToLocalStorage()
  renderCalendar()
  renderProductivityChart()
  updateOverdueNotifications()
  closeEventModal()
}

function deleteEvent() {
  const eventId = document.getElementById("eventId").value

  if (confirm("Are you sure you want to delete this event?")) {
    events = events.filter((e) => e.id !== eventId)

    saveToLocalStorage()
    renderCalendar()
    renderProductivityChart()
    updateOverdueNotifications()
    closeEventModal()
  }
}

function cancelEvent() {
  const eventId = document.getElementById("eventId").value
  const event = events.find((e) => e.id === eventId)

  if (event) {
    event.canceled = true
    saveToLocalStorage()
    renderCalendar()
    closeEventModal()
  }
}

function openCreateCalendarModal() {
  document.getElementById("createCalendarModal").classList.add("active")
}

function closeCreateCalendarModal() {
  document.getElementById("createCalendarModal").classList.remove("active")
}

function handleCreateCalendar(e) {
  e.preventDefault()

  const calendarData = {
    id: generateId(),
    name: document.getElementById("calendarName").value,
    description: document.getElementById("calendarDescription").value,
    type: "group",
    ownerId: currentUser.id,
    members: [currentUser.id],
    createdAt: new Date().toISOString(),
  }

  const inviteEmails = document.getElementById("inviteEmails").value
  if (inviteEmails) {
    const emails = inviteEmails.split(",").map((e) => e.trim())

    emails.forEach((email) => {
      let user = users.find((u) => u.email === email)

      if (!user) {
        user = {
          id: generateId(),
          email: email,
          password: "temp",
          createdAt: new Date().toISOString(),
        }
        users.push(user)
      }

      if (!calendarData.members.includes(user.id)) {
        calendarData.members.push(user.id)
      }
    })
  }

  calendars.push(calendarData)

  saveToLocalStorage()
  renderCalendarFilters()
  updateCalendarDropdown()
  closeCreateCalendarModal()
}

function renderCalendarFilters() {
  const container = document.getElementById("groupCalendarFilters")
  container.innerHTML = ""

  const userCalendars = calendars.filter((c) => c.members.includes(currentUser.id) && c.type === "group")

  userCalendars.forEach((calendar) => {
    const calendarItem = document.createElement("div")
    calendarItem.style.marginBottom = "10px"

    const btn = document.createElement("button")
    btn.className = "filter-btn"
    btn.dataset.filter = calendar.id
    btn.textContent = calendar.name
    btn.style.marginBottom = "5px"
    calendarItem.appendChild(btn)

    const actionsDiv = document.createElement("div")
    actionsDiv.style.display = "flex"
    actionsDiv.style.gap = "5px"
    actionsDiv.style.paddingLeft = "5px"

    const inviteBtn = document.createElement("button")
    inviteBtn.textContent = "Invite"
    inviteBtn.className = "btn-secondary"
    inviteBtn.style.fontSize = "0.8em"
    inviteBtn.style.padding = "4px 8px"
    inviteBtn.style.width = "auto"
    inviteBtn.onclick = (e) => {
      e.stopPropagation()
      openInviteModal(calendar.id)
    }
    actionsDiv.appendChild(inviteBtn)

    const leaveBtn = document.createElement("button")
    leaveBtn.textContent = "Leave"
    leaveBtn.className = "btn-secondary"
    leaveBtn.style.fontSize = "0.8em"
    leaveBtn.style.padding = "4px 8px"
    leaveBtn.style.width = "auto"
    leaveBtn.onclick = (e) => {
      e.stopPropagation()
      leaveGroupCalendar(calendar.id)
    }
    actionsDiv.appendChild(leaveBtn)

    if (calendar.ownerId === currentUser.id) {
      const deleteBtn = document.createElement("button")
      deleteBtn.textContent = "Delete"
      deleteBtn.className = "btn-secondary btn-danger"
      deleteBtn.style.fontSize = "0.8em"
      deleteBtn.style.padding = "4px 8px"
      deleteBtn.style.width = "auto"
      deleteBtn.onclick = (e) => {
        e.stopPropagation()
        deleteGroupCalendar(calendar.id)
      }
      actionsDiv.appendChild(deleteBtn)
    }

    calendarItem.appendChild(actionsDiv)
    container.appendChild(calendarItem)
  })
}

function leaveGroupCalendar(calendarId) {
  const calendar = calendars.find((c) => c.id === calendarId)

  if (!calendar) {
    alert("Calendar not found.")
    return
  }

  if (calendar.ownerId === currentUser.id) {
    alert("As the owner, you cannot leave this calendar. Please delete it instead.")
    return
  }

  if (!confirm(`Are you sure you want to leave "${calendar.name}"?`)) {
    return
  }

  calendar.members = calendar.members.filter((memberId) => memberId !== currentUser.id)

  if (currentFilter === calendarId) {
    currentFilter = "all"
    document.querySelectorAll(".filter-btn").forEach((btn) => btn.classList.remove("active"))
    document.querySelector('[data-filter="all"]').classList.add("active")
  }

  saveToLocalStorage()
  renderCalendarFilters()
  updateCalendarDropdown()
  renderCalendar()
}

function deleteGroupCalendar(calendarId) {
  const calendar = calendars.find((c) => c.id === calendarId)

  if (!calendar) {
    alert("Calendar not found.")
    return
  }

  if (calendar.ownerId !== currentUser.id) {
    alert("Only the calendar owner can delete it.")
    return
  }

  if (
    !confirm(
      `Are you sure you want to delete "${calendar.name}"? All events in this calendar will be permanently deleted.`,
    )
  ) {
    return
  }

  calendars = calendars.filter((c) => c.id !== calendarId)

  events = events.filter((e) => e.calendarId !== calendarId)

  if (currentFilter === calendarId) {
    currentFilter = "all"
    document.querySelectorAll(".filter-btn").forEach((btn) => btn.classList.remove("active"))
    document.querySelector('[data-filter="all"]').classList.add("active")
  }

  saveToLocalStorage()
  renderCalendarFilters()
  updateCalendarDropdown()
  renderCalendar()
}

function previousMonth() {
  currentDate.setMonth(currentDate.getMonth() - 1)
  renderCalendar()
}

function nextMonth() {
  currentDate.setMonth(currentDate.getMonth() + 1)
  renderCalendar()
}

function goToToday() {
  currentDate = new Date()
  renderCalendar()
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

function saveToLocalStorage() {
  localStorage.setItem(
    "calendarApp",
    JSON.stringify({
      currentUser,
      users,
      calendars,
      events,
    }),
  )
}

function loadFromLocalStorage() {
  const data = localStorage.getItem("calendarApp")

  if (data) {
    const parsed = JSON.parse(data)
    currentUser = parsed.currentUser
    users = parsed.users || []
    calendars = parsed.calendars || []
    events = parsed.events || []
  }
}

function updateCalendarDropdown() {
  const dropdown = document.getElementById("eventCalendar")
  dropdown.innerHTML = ""

  const selectOption = document.createElement("option")
  selectOption.value = ""
  selectOption.textContent = "Select Calendar"
  dropdown.appendChild(selectOption)

  const userCalendars = calendars.filter((c) => c.members.includes(currentUser.id))

  userCalendars.forEach((calendar) => {
    const option = document.createElement("option")
    option.value = calendar.id
    option.textContent = calendar.name
    dropdown.appendChild(option)
  })
}

function openInviteModal(calendarId) {
  const calendar = calendars.find((c) => c.id === calendarId)
  if (!calendar) return

  const modal = document.createElement("div")
  modal.className = "modal active"
  modal.id = "inviteModal"
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Invite Members to ${calendar.name}</h2>
        <button class="close-btn" onclick="closeInviteModal()">×</button>
      </div>
      <form id="inviteForm">
        <div class="form-group">
          <label for="inviteModalEmails">Enter email addresses (comma-separated)</label>
          <input type="text" id="inviteModalEmails" placeholder="user1@example.com, user2@example.com" required>
          <small style="color: #64748b; margin-top: 5px; display: block;">
            Invited users can log in with these emails to access this calendar.
          </small>
        </div>
        <div style="display: flex; gap: 10px;">
          <button type="submit" class="btn-primary">Send Invites</button>
          <button type="button" class="btn-secondary" onclick="closeInviteModal()">Cancel</button>
        </div>
      </form>
    </div>
  `

  document.body.appendChild(modal)

  document.getElementById("inviteForm").addEventListener("submit", (e) => {
    e.preventDefault()
    handleInviteSubmit(calendarId)
  })
}

function closeInviteModal() {
  const modal = document.getElementById("inviteModal")
  if (modal) {
    modal.remove()
  }
}

function handleInviteSubmit(calendarId) {
  const calendar = calendars.find((c) => c.id === calendarId)
  if (!calendar) return

  const emailsInput = document.getElementById("inviteModalEmails").value
  const emails = emailsInput
    .split(",")
    .map((e) => e.trim())
    .filter((e) => e)

  if (emails.length === 0) {
    alert("Please enter at least one email address.")
    return
  }

  let invitedCount = 0

  emails.forEach((email) => {
    let user = users.find((u) => u.email === email)

    if (!user) {
      user = {
        id: generateId(),
        email: email,
        password: "temp",
        createdAt: new Date().toISOString(),
      }
      users.push(user)
    }

    if (!calendar.members.includes(user.id)) {
      calendar.members.push(user.id)
      invitedCount++
    }
  })

  saveToLocalStorage()
  closeInviteModal()

  if (invitedCount > 0) {
    alert(
      `Successfully invited ${invitedCount} user(s) to ${calendar.name}. They can now log in with their email to access this calendar.`,
    )
  } else {
    alert("All specified users are already members of this calendar.")
  }
}

function renderProductivityChart() {
  const canvas = document.getElementById("productivityChart")
  if (!canvas) return

  const ctx = canvas.getContext("2d")

  const completedEvents = events.filter((e) => e.status === "done" && !e.canceled)

  const last7Days = []
  const dayLabels = ["M", "T", "W", "TH", "F", "Sat", "Sun"]
  const completedByDay = []
  const today = new Date()

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split("T")[0]
    last7Days.push(dateStr)

    const completedOnDay = completedEvents.filter((e) => {
      const eventDate = new Date(e.date)
      return eventDate.toISOString().split("T")[0] === dateStr
    }).length

    completedByDay.push(completedOnDay)
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const padding = 30
  const chartWidth = canvas.width - padding * 2
  const chartHeight = canvas.height - padding * 2
  const maxValue = Math.max(...completedByDay, 5)
  const barWidth = chartWidth / 7

  ctx.strokeStyle = "#64748b"
  ctx.fillStyle = "#3b82f6"

  last7Days.forEach((day, index) => {
    const x = padding + index * barWidth
    const y = padding + chartHeight - (completedByDay[index] / maxValue) * chartHeight
    const height = (completedByDay[index] / maxValue) * chartHeight

    ctx.fillRect(x, y, barWidth - 10, height)
    ctx.strokeRect(x, y, barWidth - 10, height)

    ctx.fillStyle = "#ffffff"
    ctx.font = "12px sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(dayLabels[index], x + (barWidth - 10) / 2, canvas.height - 10)
    ctx.fillStyle = "#3b82f6"
  })

  const weekCompleted = completedByDay.reduce((a, b) => a + b, 0)
  document.getElementById("totalCompleted").textContent = completedEvents.length
  document.getElementById("weekCompleted").textContent = weekCompleted
}

function updateOverdueNotifications() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const overdueEvents = events.filter((e) => {
    const eventDate = new Date(e.date)
    eventDate.setHours(0, 0, 0, 0)
    return eventDate < today && e.status !== "done" && !e.canceled
  })

  const overdueCount = document.getElementById("overdueCount")
  if (overdueEvents.length > 0) {
    overdueCount.textContent = overdueEvents.length
    overdueCount.style.display = "block"
  } else {
    overdueCount.style.display = "none"
  }

  const overdueList = document.getElementById("overdueEventsList")
  if (overdueEvents.length === 0) {
    overdueList.innerHTML = '<p style="padding: 20px; text-align: center; color: #64748b;">No overdue events</p>'
  } else {
    overdueList.innerHTML = overdueEvents
      .map(
        (event) => `
      <div style="padding: 15px; border-bottom: 1px solid #333;">
        <div style="font-weight: 600; color: #fff; margin-bottom: 5px;">${event.title}</div>
        <div style="font-size: 0.9em; color: #94a3b8;">
          Due: ${new Date(event.date).toLocaleDateString()} at ${event.time}
        </div>
        <div style="font-size: 0.85em; color: #64748b; margin-top: 5px;">
          Priority: ${event.priority === "urgent" ? "🔴 Urgent" : "🟢 Normal"}
        </div>
      </div>
    `,
      )
      .join("")
  }
}

function toggleOverdueModal() {
  const modal = document.getElementById("overdueModal")
  if (modal.style.display === "flex") {
    modal.style.display = "none"
  } else {
    updateOverdueNotifications()
    modal.style.display = "flex"
  }
}
