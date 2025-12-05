import db from './database.js';

// =================== المتغيرات العامة ===================
let currentPage = 1;
const itemsPerPage = 10;
let filteredShifts = [];
let allShifts = [];
let currentEmployee = null;

// =================== تسجيل الخروج ===================
function handleLogout() {
    sessionStorage.removeItem('employeeData');
    location.replace('login.html');
}
window.logout = function() { handleLogout(); };

// =================== التحقق من تسجيل الدخول ===================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const employeeData = sessionStorage.getItem('employeeData');
        if (!employeeData) {
            window.location.href = 'login.html';
            return;
        }

        currentEmployee = JSON.parse(employeeData);
        const employeeNameElement = document.getElementById('employeeName');
        if (employeeNameElement && currentEmployee.name)
            employeeNameElement.textContent = currentEmployee.name;

        displayEmployeeInfo(currentEmployee);
        await loadScheduleData();
        await loadImages();

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', e => {
            e.preventDefault();
            handleLogout();
        });

    } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
        showMessage('error', 'حدث خطأ أثناء تحميل البيانات');
    }
});

// =================== عرض معلومات الموظف ===================
function displayEmployeeInfo(employee) {
    const html = `
        <div class="employee-info">
            <div id="employeeBadge">${createRankBadge(employee.rank)}</div>
            <button class="change-badge-btn ms-2" onclick="openBadgeModal()">
                <i class="fas fa-edit"></i> تغيير الشارة
            </button>
        </div>
        <div class="employee-name">${employee.name}</div>
    `;
    document.getElementById('employeeInfo').innerHTML = html;
}

// =================== تحميل بيانات المناوبات ===================
async function loadScheduleData() {
    try {
        const scheduleData = await db.getScheduleData();
        allShifts = scheduleData.filter(row =>
            row.name.trim().toLowerCase() === currentEmployee.name.trim().toLowerCase() &&
            row.rank.trim().toLowerCase() === currentEmployee.rank.trim().toLowerCase()
        );
        allShifts.sort((a, b) => new Date(a.date) - new Date(b.date));
        filteredShifts = allShifts;
        displayShifts();
    } catch (error) {
        console.error('خطأ في تحميل بيانات الجدول:', error);
        showMessage('error', 'حدث خطأ أثناء تحميل بيانات الجدول');
    }
}

function calculateTotalHours(shift) {
    if (shift.startTime && shift.endTime) {
        const start = new Date(shift.startTime);
        const end = new Date(shift.endTime);
        return ((end - start) / (1000 * 60 * 60)).toFixed(2);
    }
    return 0;
}

function displayShifts() {
    const tbody = document.getElementById('scheduleTableBody');
    const start = (currentPage - 1) * itemsPerPage;
    const pageItems = filteredShifts.slice(start, start + itemsPerPage);

    tbody.innerHTML = pageItems.map(shift => {
        const totalHours = calculateTotalHours(shift);
        const rowClass = shift.startTime && !shift.endTime ? 'table-success' : shift.endTime ? 'table-danger' : '';
        return `
        <tr class="${rowClass}">
            <td>${formatDate(shift.date)}</td>
            <td>${getDayName(shift.date)}</td>
            <td class="rank-cell">${shift.rank}</td>
            <td>${shift.shift}</td>
            <td><span class="badge bg-${getStatusBadge(shift.date)}">${getStatusText(shift.date)}</span></td>
            <td class="text-end">${totalHours > 0 ? totalHours + ' ساعة' : '-'}</td>
        </tr>`;
    }).join('');
    updatePagination();
}

function updatePagination() {
    const pagination = document.getElementById('pagination');
    const totalPages = Math.ceil(filteredShifts.length / itemsPerPage);
    let html = `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1})">السابق</a>
        </li>
    `;
    for (let i = 1; i <= totalPages; i++) {
        html += `
            <li class="page-item ${currentPage === i ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
            </li>`;
    }
    html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1})">التالي</a>
        </li>`;
    pagination.innerHTML = html;
}
window.changePage = function(page) {
    if (page < 1 || page > Math.ceil(filteredShifts.length / itemsPerPage)) return;
    currentPage = page;
    displayShifts();
};

// =================== توابع مساعدة ===================
function formatDate(dateStr) {
    return new Intl.DateTimeFormat('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
        .format(new Date(dateStr));
}
function getDayName(dateStr) {
    return new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(new Date(dateStr));
}
function getStatusBadge(dateStr) {
    const d = new Date(dateStr), t = new Date(); t.setHours(0, 0, 0, 0);
    if (d < t) return 'secondary'; if (d.getTime() === t.getTime()) return 'primary'; return 'success';
}
function getStatusText(dateStr) {
    const d = new Date(dateStr), t = new Date(); t.setHours(0, 0, 0, 0);
    if (d < t) return 'مكتملة'; if (d.getTime() === t.getTime()) return 'اليوم'; return 'قادمة';
}

// =================== تحميل الصور ===================
async function loadImages() {
    try {
        const images = await db.getAllImages();
        const grid = document.querySelector('.image-grid');
        grid.innerHTML = '';
        images.forEach(img => {
            const card = document.createElement('div');
            card.className = 'image-card';
            card.innerHTML = `
                <img src="${img.path}" alt="${img.title}">
                <div class="image-overlay"><span class="image-title">${img.title}</span></div>`;
            grid.appendChild(card);
        });
    } catch (e) {
        console.error('خطأ في تحميل الصور:', e);
    }
}

// =================== رسائل النظام ===================
function showMessage(type, msg) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `${msg}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
    document.querySelector('.container').prepend(alertDiv);
    setTimeout(() => alertDiv.remove(), 5000);
}

// =================== بيانات المسعفين ===================
const paramedics = [
    { name: "محمد", code: "H-60/", age: 28 },

];

// =================== نظام الحضور والانصراف ===================
const timeStorageKey = "paramedicsTimeData";
function getTimeData() {
    return JSON.parse(localStorage.getItem(timeStorageKey) || "{}");
}
function saveTimeData(data) {
    localStorage.setItem(timeStorageKey, JSON.stringify(data));
}

// تسجيل الدخول مع تحقق من الكود الخاص
window.recordCheckIn = function (code) {
    const activeCode = localStorage.getItem('activeCode');
    if (activeCode !== code) {
        alert("🚫 لا يمكنك تسجيل الدخول في كود مسعف آخر.");
        return;
    }

    const data = getTimeData();
    if (data[code] && data[code].checkIn && !data[code].checkOut) {
        alert("تم تسجيل الدخول بالفعل لهذا المسعف.");
        return;
    }

    const now = new Date();
    if (!data[code]) data[code] = {};
    data[code].checkIn = now.toISOString();
    data[code].checkOut = null;
    saveTimeData(data);

    alert(`✅ تم تسجيل الدخول للمسعف (${code}) في الساعة ${now.toLocaleTimeString('ar-SA')}`);
};

// تسجيل الخروج مع تحقق من الكود الخاص
window.recordCheckOut = function (code) {
    const activeCode = localStorage.getItem('activeCode');
    if (activeCode !== code) {
        alert("🚫 لا يمكنك تسجيل الخروج في كود مسعف آخر.");
        return;
    }

    const data = getTimeData();
    if (!data[code] || !data[code].checkIn) {
        alert("يجب تسجيل الدخول أولاً قبل الخروج.");
        return;
    }

    const now = new Date();
    data[code].checkOut = now.toISOString();

    const start = new Date(data[code].checkIn);
    const diffHours = ((now - start) / (1000 * 60 * 60)).toFixed(2);
    data[code].totalHours = diffHours;
    saveTimeData(data);

    const hoursCell = document.getElementById(`hours-${code}`);
    if (hoursCell) hoursCell.textContent = `${diffHours} ساعة`;

    alert(`تم تسجيل الخروج للمسعف (${code}) عند ${now.toLocaleTimeString('ar-SA')}.\nالمدة: ${diffHours} ساعة.`);
};

// عند تحميل الصفحة، عرض الساعات السابقة من التخزين
document.addEventListener("DOMContentLoaded", () => {
    const data = getTimeData();
    for (const code in data) {
        if (data[code].totalHours) {
            const cell = document.getElementById(`hours-${code}`);
            if (cell) cell.textContent = `${data[code].totalHours} ساعة`;
        }
    }
});
// =================== إنشاء شارة الرتبة ===================
function createRankBadge(rank) {
    let colorClass = 'badge-secondary';
    switch (rank.toLowerCase()) {
        case 'مبتدئ':
            colorClass = 'badge-success';
            break;
        case 'متوسط':
            colorClass = 'badge-primary';
            break;
        case 'متقدم':
            colorClass = 'badge-warning';
            break;
        case 'خبير':
            colorClass = 'badge-danger';
            break;
    }
    return `<span class="badge ${colorClass} rank-badge     ">${rank}</span>`;
}

// =================== فتح نافذة تغيير الشارة ===================
window.openBadgeModal = function() {
    const modal = new bootstrap.Modal(document.getElementById('badgeModal'));
    modal.show();
};

document.addEventListener('DOMContentLoaded', () => {
  const activeCode = localStorage.getItem('activeCode');
  const discordId = localStorage.getItem('discordId');

  if (!activeCode || !discordId) {
    alert("🚫 يجب تسجيل الدخول أولاً.");
    window.location.href = "login.html";
    return;
  }
});

// =================== تغيير ================================
function recordCheckOut(paramedicId) {
    const now = new Date();
    const loginTimeISO = localStorage.getItem(paramedicId + "_login");

    if (!loginTimeISO) {
        alert("⚠️ لم يتم تسجيل الدخول أولاً!");
        return;
    }

    const loginDate = new Date(loginTimeISO);
    const sessionDuration = calculateDuration(loginDate, now);

    // 🧮 إضافة المدة الجديدة إلى الساعات السابقة
    const previousHours = parseFloat(localStorage.getItem(paramedicId + "_hours")) || 0;
    const totalHours = previousHours + parseFloat(sessionDuration);

    // 💾 تحديث البيانات في localStorage
    localStorage.setItem(paramedicId + "_logout", now.toISOString());
    localStorage.setItem(paramedicId + "_hours", totalHours.toFixed(2));
    localStorage.setItem(paramedicId + "_status", "offline"); // حالة جديدة

    // 👀 تحديث الواجهة
    const outCell = document.getElementById("out-" + paramedicId);
    if (outCell) outCell.textContent = now.toLocaleTimeString("ar-SA");

    const hoursCell = document.getElementById("hours-" + paramedicId);
    if (hoursCell) hoursCell.textContent = totalHours.toFixed(2) + " ساعة";

    // 🔒 لا نحذف login — فقط نحدث الحالة
    alert("✅ تم تسجيل الخروج وحفظ الساعات بنجاح.");
}


// =================== تغيير شارة الرتبة ===================
window.changeBadge = function() {
    const select = document.getElementById('rankSelect');
    const newRank = select.value;
    if (!newRank) {
        alert('يرجى اختيار رتبة جديدة.');
        return;
    }

    currentEmployee.rank = newRank;
    sessionStorage.setItem('employeeData', JSON.stringify(currentEmployee));
    displayEmployeeInfo(currentEmployee);
    loadScheduleData();

    const modalElement = document.getElementById('badgeModal');
    const modal = bootstrap.Modal.getInstance(modalElement);
    modal.hide();
};