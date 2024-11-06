"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDate = formatDate;
function formatDate(date) {
    return `${date.getDay()}.${(date.getMonth() + 1)
        .toString()
        .padStart(2, '0')} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
}
