// ==UserScript==
// @name         GitHub 日期格式美化（多格式title自动识别版）
// @namespace    http://tampermonkey.net/
// @version      1.9
// @description  将 GitHub 页面中的日期统一显示为 YYYY/MM/DD HH:mm:ss（本地时区）
// @match        https://github.com/*
// @downloadURL  https://raw.githubusercontent.com/nonkr/tampermonkey_scripts/master/github-date-formatter.user.js
// @updateURL    https://raw.githubusercontent.com/nonkr/tampermonkey_scripts/master/github-date-formatter.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const timeSelector = [
        'relative-time[datetime]',
        'local-time[datetime]',
        'time-ago[datetime]',
        'time-until[datetime]',
        'time[datetime]'
    ].join(',');

    const shadowObservers = new WeakMap();

    const style = document.createElement('style');
    style.textContent = `
        relative-time[datetime],
        local-time[datetime],
        time-ago[datetime],
        time-until[datetime],
        time[datetime] {
            white-space: nowrap !important;
        }

        .react-directory-commit-age {
            min-width: 168px !important;
            overflow: visible !important;
            white-space: nowrap !important;
        }

        table:has(.react-directory-commit-age) thead th:last-child,
        table:has(.react-directory-commit-age) tbody tr.react-directory-row > td:last-child {
            width: 184px !important;
            min-width: 184px !important;
        }
    `;
    document.head.appendChild(style);

    function pad(value) {
        return String(value).padStart(2, '0');
    }

    function formatDate(str) {
        const date = new Date(str);
        if (Number.isNaN(date.getTime())) return null;

        return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ` +
            `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }

    function getDisplayNode(el) {
        if (!el.shadowRoot) return el;

        return el.shadowRoot.querySelector('[part~="root"]') ||
            el.shadowRoot.querySelector('span') ||
            Array.from(el.shadowRoot.childNodes).find(node => node.nodeType === Node.TEXT_NODE) ||
            null;
    }

    function observeShadowRoot(el) {
        if (!el.shadowRoot || shadowObservers.has(el.shadowRoot)) return;

        const observer = new MutationObserver(() => updateTimeElement(el));
        observer.observe(el.shadowRoot, {
            childList: true,
            characterData: true,
            subtree: true
        });
        shadowObservers.set(el.shadowRoot, observer);
    }

    function updateTimeElement(el) {
        // datetime 是稳定的 ISO 8601 值；title 会随语言和 12/24 小时制变化。
        const source = el.getAttribute('datetime') || el.getAttribute('title');
        if (!source) return;

        const formatted = formatDate(source);
        if (!formatted) return;

        observeShadowRoot(el);

        const displayNode = getDisplayNode(el);
        if (displayNode && displayNode.textContent.trim() !== formatted) {
            displayNode.textContent = formatted;
        }
    }

    function updateAllTimes() {
        document.querySelectorAll(timeSelector).forEach(updateTimeElement);
    }

    let updateScheduled = false;
    function scheduleUpdate() {
        if (updateScheduled) return;
        updateScheduled = true;

        requestAnimationFrame(() => {
            updateScheduled = false;
            updateAllTimes();
        });
    }

    updateAllTimes();

    // GitHub 使用局部导航动态替换内容，同时日期组件本身也可能重新渲染。
    const observer = new MutationObserver(scheduleUpdate);
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['datetime', 'title']
    });
})();
