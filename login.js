// تهيئة Supabase Client
const supabaseUrl = "https://atmgfgjzftplkucvooqb.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bWdmZ2p6ZnRwbGt1Y3Zvb3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3OTQ0MjQsImV4cCI6MjA4MDM3MDQyNH0.ntz24NveusjylTBKZk8nUKnH679iW7TyoV1pXbFVIRE";

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// ===== دوال مساعدة =====

/**
 * إظهار رسالة للمستخدم
 * @param {string} title - عنوان الرسالة
 * @param {string} message - نص الرسالة
 * @param {string} type - نوع الرسالة (success, error, info)
 */
function showNotification(title, message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    notification.style.top = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.zIndex = '9999';
    notification.style.minWidth = '300px';
    notification.style.textAlign = 'center';
    notification.role = 'alert';
    
    notification.innerHTML = `
        <strong>${title}</strong>
        <div>${message}</div>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    document.body.appendChild(notification);
    
    // إزالة الإشعار تلقائياً بعد 5 ثواني
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// ===== نظام تسجيل الدخول للموظفين =====

document.addEventListener('DOMContentLoaded', function() {
    // تسجيل الدخول كموظف
    const employeeForm = document.getElementById('employeeLoginForm');
    if (employeeForm) {
        employeeForm.addEventListener('submit', handleEmployeeLogin);
    }

    // تسجيل الدخول كمسعف
    const medicForm = document.getElementById('loginForm');
    if (medicForm) {
        medicForm.addEventListener('submit', handleMedicLogin);
    }

    // زر تسجيل الدخول القديم
    const medicLoginBtn = document.querySelector('.btn-success[onclick="loginMedic()"]');
    if (medicLoginBtn) {
        medicLoginBtn.onclick = handleLegacyMedicLogin;
    }
});

/**
 * معالجة تسجيل دخول الموظف
 */
async function handleEmployeeLogin(e) {
    e.preventDefault();
    
    const employeeName = document.getElementById('employeeName')?.value.trim();
    
    if (!employeeName) {
        showNotification('خطأ', 'الرجاء إدخال اسم الموظف', 'error');
        return;
    }

    try {
        // حفظ بيانات الموظف
        const employeeData = {
            name: employeeName,
            role: 'employee',
            loginTime: new Date().toLocaleString('ar-SA')
        };

        sessionStorage.setItem('employeeData', JSON.stringify(employeeData));
        showNotification('تم بنجاح', `مرحباً ${employeeName}`, 'success');
        
        // الانتقال إلى الصفحة الرئيسية بعد ثانية
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        showNotification('خطأ', 'حدث خطأ أثناء محاولة تسجيل الدخول', 'error');
    }
}

/**
 * معالجة تسجيل دخول المسعف (النموذج الجديد)
 */
async function handleMedicLogin(e) {
    e.preventDefault();
    
    const code = document.getElementById('paramedicCode')?.value.trim();
    const discordId = document.getElementById('discordId')?.value.trim();
    const loginBtn = document.querySelector('#loginForm button[type="submit"]');

    if (!code || !discordId) {
        showNotification('خطأ', 'الرجاء إدخال كافة البيانات المطلوبة', 'error');
        return;
    }

    try {
        // إظهار حالة التحميل
        const originalBtnText = loginBtn?.innerHTML;
        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> جاري التحقق...';
        }

        // البحث عن المسعف في قاعدة البيانات
        const { data: medic, error } = await supabaseClient
            .from('medics')
            .select('*')
            .eq('id', code)
            .eq('discord_id', discordId)
            .single();

        // إعادة تعيين حالة الزر
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerHTML = originalBtnText;
        }

        if (error || !medic) {
            showNotification('خطأ', 'بيانات الدخول غير صحيحة. يرجى التحقق من الرمز ورقم الديسكورد', 'error');
            return;
        }

        // حفظ بيانات الجلسة
        localStorage.setItem('activeCode', medic.id);
        localStorage.setItem('discordId', medic.discord_id);
        localStorage.setItem('activeMedic', JSON.stringify(medic));

        showNotification('تم بنجاح', `أهلاً بك ${medic.name || code}، سيتم تحويلك الآن...`, 'success');
        
        // الانتقال إلى الصفحة الرئيسية بعد 1.5 ثانية
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        
    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        showNotification('خطأ', 'حدث خطأ أثناء محاولة تسجيل الدخول', 'error');
        
        // إعادة تعيين حالة الزر في حالة الخطأ
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'تسجيل الدخول';
        }
    }
}

/**
 * معالجة تسجيل دخول المسعف (النموذج القديم - للتوافقية)
 */
async function handleLegacyMedicLogin() {
    const id = document.getElementById('medic_id')?.value.trim();
    const code = document.getElementById('medic_code')?.value.trim();

    if (!id || !code) {
        showNotification('خطأ', 'الرجاء إدخال كافة البيانات المطلوبة', 'error');
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('medics')
            .select('*')
            .eq('id', id)
            .eq('code', code)
            .single();

        if (error || !data) {
            showNotification('خطأ', 'بيانات الدخول غير صحيحة', 'error');
            return;
        }

        // حفظ بيانات الجلسة
        localStorage.setItem('activeMedic', JSON.stringify(data));
        showNotification('تم بنجاح', `مرحباً ${data.name || id}، سيتم تحويلك الآن...`, 'success');
        
        // الانتقال إلى الصفحة الرئيسية بعد 1.5 ثانية
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        
    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        showNotification('خطأ', 'حدث خطأ أثناء محاولة تسجيل الدخول', 'error');
    }
}
