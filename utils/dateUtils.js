// Returns the week year in the format and the day of week
// in the format ["ww-yyyy", d]
// from the given date string "yyyy-mm-dd"
function getWeekYearAndDay(date) {
    if (date.length != 10)
        throw new Error("Invalid date format!");

    const dateObj = new Date(date);
    if (isNaN(dateObj))
        throw new Error("Date cannot be parsed!");

    const firstDayOfYear = new Date(dateObj.getFullYear(), 0);
    const msFromYearStart = dateObj.getTime() - firstDayOfYear.getTime();
    const weekNumber = Math.ceil( msFromYearStart / 86400000 / 7 );
    const dayNumber = dateObj.getDay();

    return [`${weekNumber < 10 ? "0" + weekNumber : weekNumber}-${dateObj.getFullYear()}`,
            dayNumber];
}

// A valid week year should be in the form of ww-yyyy
function isValidWeekYear(weekYear) {
    const regex = /^\d{2}-\d{4}$/;
    return regex.test(weekYear);
}

module.exports = {
    getWeekYearAndDay,
    isValidWeekYear
}