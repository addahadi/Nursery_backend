import sql from '../db.js';

/**
 * جلب الأطفال التابعين للأستاذ
 */

export const getChildrenByTeacher = async (teacherId) => {
  const children = await sql`
SELECT
id,
full_name,
age,
classrom_id
FORM child
WHERE teacher_id = ${teacherId}


`;
  return children;
};

/// الأستاذ يطلع التقرير (CREATE)

export const createChildReport = async ({
  child_id,
  date,
  foodIntake,
  activitylevel,
  sleepQuality,
  behavoir,
  generalNotes,
}) => {
  // 1️⃣ تأكد أن الطفل تابع للأستاذ
  const child = await sql`
SELECT child_id 
FROM child 
WHERE child_id = ${child_id}
AND teacher_id = ${teacherId}`;
  if (child.length === 0) {
    throw new Error('FORBIDDEN');
  }
  //إنشاء التقرير
  await sql`
INSERT INTO report(
child_id,
report_date,
food_intake ,
activity_level,
sleep_quality,
behaviour,
general_notes) VALUES(
${child_id},
${report_date},
${food_intake},
${activity_level},
${sleep_quality},
${behavoir},
${general_notes}
)`;
};

/**
 * إضافة media لنشاط من طرف الأستاذ
 */
export const addActivityMedia= async({
teacherId,
activityid,
name,
file_path,
description,
date,
classroomid,
})=>{
// 1️⃣ تحقق أن النشاط تابع للأستاذ
const activity = await sql`
SELECT id 
FROM activity
WHERE id = ${activityid}
AND teacherid = ${teacherId}`;
if (activity.length ===0){
  throw new Error('forbidden')
}
  // 2️⃣ إدخال media في DB
await sql `
INSERT INTO activity_media(
name,
file_path,
description,
date,
classroomId,
) VALUES(
 ${name},
 ${file_path},
 ${description},
 ${date},
 ${classroomId})`;
};
