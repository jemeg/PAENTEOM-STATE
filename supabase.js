// استيراد مكتبة Supabase
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// تهيئة اتصال Supabase
const supabaseUrl = 'https://atmgfgjzftplkucvooqb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiIsImF0bWdmZ2p6ZnRwbGt1Y3Zvb3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3OTQ0MjQsImV4cCI6MjA4MDM3MDQyNH0.ntz24NveusjylTBKZk8nUKnH679iW7TyoV1pXbFVIRE';
const supabase = createClient(supabaseUrl, supabaseKey);

// جلب بيانات المسعف من التخزين
function getActiveMedic() {
    const medic = localStorage.getItem('activeMedic');
    return medic ? JSON.parse(medic) : null;
}

// تصدير supabase للاستخدام في الملفات الأخرى
window.supabase = supabase;
// إتاحة alias باسم db للملفات القديمة التي تستخدم db
window.db = supabase;

// تسجيل خروج
function logout() {
    localStorage.removeItem("activeMedic");
    window.location.href = "index.html";
}

// إضافة نقاط يدوياً
async function addPoints(medicId, amount, reason) {
    await supabase.from("points").insert([
        { medic_id: medicId, amount, reason }
    ]);
}

// حفظ ساعات تواجد المسعف
async function saveMedicHours(medicId, date, startTime, endTime, totalHours) {
    try {
        const { data, error } = await supabase
            .from('medic_hours')
            .upsert(
                {
                    medic_id: medicId,
                    date: date,
                    start_time: startTime,
                    end_time: endTime,
                    total_hours: totalHours,
                    updated_at: new Date().toISOString()
                },
                { onConflict: 'medic_id,date' }
            )
            .select();
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error saving medic hours:', error);
        throw error;
    }
}

// حساب مجموع نقاط المسعف
async function getTotalPoints(medicId) {
    const { data: records } = await supabase
        .from("points")
        .select("amount")
        .eq("medic_id", medicId);

    let total = 0;
    if (records) {
        records.forEach(r => {
            // التأكد من أن القيمة رقمية
            const amount = Number(r.amount) || 0;
            total += amount;
        });
    }

    return total;
}
