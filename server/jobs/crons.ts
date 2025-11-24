// All schedules run at 18:30 AEST/AEDT (Australia/Sydney)
// Use your scheduler’s timezone option: timezone: 'Australia/Sydney'
 
// TEST SCHEDULE
export const testSchedule = '* * * * *'; 


/**
 * First day of every month @ 18:30
 */
export const firstOfTheMonth = '30 18 1 * *';


/**
 * Third Monday of the month @ 18:30
 * Cron runs only between the 15th–21st; guard ensures Monday.
 */
export const reminderThirdMonday = '30 18 15-21 * *';


/**
 * Third Thursday of the month @ 18:30
 * Cron runs only between the 15th–21st; guard ensures Thursday.
 */
export const reminderThirdThursday = '30 18 15-21 * *';



/**
 * Second Monday of the month @ 18:30
 * Cron runs only between the 8th–30th; guard ensures Monday.
 */
export const secondMondayReminder = '30 18 8-30 * *';


export function isThirdMonday(date: Date): boolean {
  if (date.getDay() !== 1) return false;

  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const firstMonday = new Date(
    year,
    month,
    1 + ((1 - firstDay.getDay() + 7) % 7)
  );

  const thirdMonday = new Date(firstMonday);
  thirdMonday.setDate(firstMonday.getDate() + 14);

  return date.getDate() === thirdMonday.getDate();
}


export function isThirdThursday(date: Date): boolean {
  if (date.getDay() !== 4) return false;

  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const firstThursday = new Date(
    year,
    month,
    1 + ((4 - firstDay.getDay() + 7) % 7)
  );

  const thirdThursday = new Date(firstThursday);
  thirdThursday.setDate(firstThursday.getDate() + 14);

  return date.getDate() === thirdThursday.getDate();
}


export function isSecondMonday(date: Date): boolean {
  if (date.getDay() !== 1) return false;

  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const firstMonday = new Date(
    year,
    month,
    1 + ((1 - firstDay.getDay() + 7) % 7)
  );

  const secondMonday = new Date(firstMonday);
  secondMonday.setDate(firstMonday.getDate() + 7);

  return date.getDate() === secondMonday.getDate();
}
