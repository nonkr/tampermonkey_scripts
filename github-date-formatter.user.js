// ==UserScript==
// @name         GitHub 日期格式美化（多格式title自动识别版）
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  自动格式化 relative-time 节点（兼容 title 为中式或美式日期+时间+时区，shadow DOM）
// @match        https://github.com/*
// @downloadURL  https://raw.githubusercontent.com/nonkr/tampermonkey_scripts/master/github-date-formatter.user.js
// @updateURL    https://raw.githubusercontent.com/nonkr/tampermonkey_scripts/master/github-date-formatter.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const months = {
        Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
        Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12"
    };

    function formatDate(str) {
        // 1. 处理 2024/01/30 18:07:00 这种格式
        let m = str.match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
        if (m) {
            // return `${m[1]}/${m[2]}/${m[3]}`; // 只显示日期
            return `${m[1]}/${m[2]}/${m[3]}${m[4]?` ${m[4]}:${m[5]||'00'}:${m[6]||'00'}`:''}`; // 显示日期+时间
        }

        // 2. 处理 May 23, 2025, 6:35 PM GMT+8 或 May 23, 2025, 6:35 PM
        m = str.match(/^([A-Z][a-z]{2}) (\d{1,2}), (\d{4}), (\d{1,2}):(\d{2}) (AM|PM)(?: GMT.*)?$/);
        if (m) {
            let [_, mon, day, year, hour, minute, ampm] = m;
            day = day.padStart(2, '0');
            hour = parseInt(hour, 10);
            if (ampm === 'PM' && hour !== 12) hour += 12;
            if (ampm === 'AM' && hour === 12) hour = 0;
            hour = String(hour).padStart(2, '0');
            return `${year}/${months[mon]}/${day} ${hour}:${minute}:00`;
        }

        // 3. 处理 May 23, 2025
        m = str.match(/^([A-Z][a-z]{2}) (\d{1,2}), (\d{4})$/);
        if (m) {
            let [_, mon, day, year] = m;
            day = day.padStart(2, '0');
            return `${year}/${months[mon]}/${day}`;
        }

        // 其它格式直接返回原始字符串
        return str;
    }

    function updateRelativeTimes() {
        document.querySelectorAll('relative-time').forEach(el => {
            const src = el.getAttribute('title') || el.getAttribute('datetime');
            if (!src) return;
            const formatted = formatDate(src);

            // 1. Shadow DOM，直接改文本节点
            if (el.shadowRoot && el.shadowRoot.childNodes.length > 0) {
                const node = el.shadowRoot.childNodes[0];
                if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== formatted) {
                    node.textContent = formatted;
                }
            }
            // 2. 无 shadowRoot，直接改 textContent
            else if (!el.shadowRoot && el.textContent.trim() !== formatted) {
                el.textContent = formatted;
            }
        });
    }

    updateRelativeTimes();

    // 监听页面变动，动态内容也能生效
    const observer = new MutationObserver(updateRelativeTimes);
    observer.observe(document.body, { childList: true, subtree: true });
})();
