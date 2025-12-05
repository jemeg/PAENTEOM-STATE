// دالة تسجيل الدخول
async function login(paramedicCode, discordId) {
    try {
        // التحقق من البيانات في قاعدة البيانات
        const { data: medic, error } = await supabase
            .from('medics')
            .select('*')
            .eq('code', paramedicCode)
            .eq('discord_id', discordId)
            .single();

        if (error) throw error;
        if (!medic) throw new Error('بيانات الدخول غير صحيحة');

        // حفظ بيانات المسعف في localStorage
        const medicData = {
            id: medic.id,
            code: medic.code,
            name: medic.name,
            role: medic.role,
            rank: medic.rank,
            loginTime: new Date().toISOString()
        };
        
        localStorage.setItem('activeMedic', JSON.stringify(medicData));
        
        // تسجيل وقت الدخول في السجل
        await recordLogin(medicData.id);
        
        return { success: true, medic: medicData };
    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        return { success: false, error: error.message };
    }
}

// دالة تسجيل الخروج
async function logout() {
    try {
        const medic = JSON.parse(localStorage.getItem('activeMedic'));
        
        if (medic && medic.id) {
            // تسجيل وقت الخروج في السجل
            await recordLogout(medic.id);
        }
        
        // مسح بيانات الجلسة
        localStorage.removeItem('activeMedic');
        
        // إعادة التوجيه إلى صفحة تسجيل الدخول
        window.location.href = 'login.html';
        
        return { success: true };
    } catch (error) {
        console.error('خطأ في تسجيل الخروج:', error);
        return { success: false, error: error.message };
    }
}

// تسجيل وقت الدخول
async function recordLogin(medicId) {
    try {
        const loginTime = new Date().toISOString();
        
        // حفظ في السجل المحلي للاستخدام الفوري
        localStorage.setItem(medicId + '_login', loginTime);
        
        // حفظ في قاعدة البيانات
        const { data, error } = await supabase
            .from('medic_sessions')
            .upsert(
                {
                    medic_id: medicId,
                    login_time: loginTime,
                    status: 'active'
                },
                { onConflict: 'medic_id' }
            )
            .select();
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('خطأ في تسجيل وقت الدخول:', error);
        throw error;
    }
}

// تسجيل وقت الخروج
async function recordLogout(medicId) {
    try {
        const logoutTime = new Date().toISOString();
        
        // الحصول على وقت الدخول
        const loginTime = localStorage.getItem(medicId + '_login');
        
        if (!loginTime) {
            console.warn('لم يتم العثور على وقت دخول للمسعف');
            return;
        }
        
        // حساب مدة التواجد
        const durationMs = new Date(logoutTime) - new Date(loginTime);
        const durationHours = (durationMs / (1000 * 60 * 60)).toFixed(2);
        
        // تحديث السجل في قاعدة البيانات
        const { data, error } = await supabase
            .from('medic_sessions')
            .update({
                logout_time: logoutTime,
                duration: durationHours,
                status: 'completed',
                updated_at: new Date().toISOString()
            })
            .eq('medic_id', medicId)
            .eq('status', 'active')
            .select();
            
        if (error) throw error;
        
        // تحديث إجمالي الساعات في جدول المسعفين
        await updateTotalHours(medicId, durationHours);
        
        // مسح البيانات المحلية
        localStorage.removeItem(medicId + '_login');
        
        return data;
    } catch (error) {
        console.error('خطأ في تسجيل وقت الخروج:', error);
        throw error;
    }
}

// تحديث إجمالي ساعات العمل
async function updateTotalHours(medicId, hoursToAdd) {
    try {
        // الحصول على إجمالي الساعات الحالي
        const { data: medic, error } = await supabase
            .from('medics')
            .select('total_hours')
            .eq('id', medicId)
            .single();
            
        if (error) throw error;
        
        // تحديث إجمالي الساعات
        const newTotal = (parseFloat(medic.total_hours || 0) + parseFloat(hoursToAdd)).toFixed(2);
        
        const { data, error: updateError } = await supabase
            .from('medics')
            .update({ total_hours: newTotal })
            .eq('id', medicId)
            .select();
            
        if (updateError) throw updateError;
        
        return data;
    } catch (error) {
        console.error('خطأ في تحديث إجمالي الساعات:', error);
        throw error;
    }
}

// التحقق من حالة تسجيل الدخول
function checkAuth() {
    const medic = JSON.parse(localStorage.getItem('activeMedic') || 'null');
    if (!medic || !medic.id) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// التحقق من انتهاء الجلسة
function checkSession() {
    const lastActivity = localStorage.getItem('lastActivity');
    const sessionTimeout = 60 * 60 * 1000; // 60 دقيقة
    
    if (lastActivity && (Date.now() - lastActivity > sessionTimeout)) {
        // انتهت الجلسة، تسجيل الخروج التلقائي
        logout();
        return false;
    }
    
    // تحديث وقت آخر نشاط
    localStorage.setItem('lastActivity', Date.now());
    return true;
}

// تحديث وقت النشاط عند التفاعل مع الصفحة
document.addEventListener('mousemove', () => localStorage.setItem('lastActivity', Date.now()));
document.addEventListener('keypress', () => localStorage.setItem('lastActivity', Date.now()));

// تصدير الدوال
window.auth = {
    login,
    logout,
    checkAuth,
    checkSession,
    recordLogin,
    recordLogout
};
