/* ==========================================================================
   VOLTORA - Chart helper (Chart.js)
   One place for the chart look so every chart matches the design system.
   ========================================================================== */
const Charts = (() => {
  const cache = {};
  function setup() {
    if (!window.Chart) return;
    Chart.defaults.font.family = '"Inter", -apple-system, "Segoe UI", sans-serif';
    Chart.defaults.font.size = 12;
    Chart.defaults.color = cssv('--muted') || '#64748b';
    Chart.defaults.borderColor = cssv('--line') || '#e9edf5';
    Chart.defaults.animation = Motion.reduced() ? false : { duration: 800, easing: 'easeOutQuart' };
    Chart.defaults.plugins.tooltip.backgroundColor = '#0d1526'; Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,.12)'; Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
  }
  /**
   * make(canvasId, type, labels, datasets, options)
   * options.onPick(index, label)  -> makes the chart clickable (e.g. drill down to a filtered list)
   * options.title / options.yTitle / options.xTitle -> axis + chart titles
   */
  function make(id, type, labels, datasets, o = {}) {
    setup();
    const canvas = document.getElementById(id); if (!canvas) return null;
    if (cache[id]) cache[id].destroy();
    const round = ['doughnut', 'pie'].includes(type);
    const cfg = {
      type, data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: o.indexAxis || 'x',
        interaction: { mode: round ? 'nearest' : 'index', intersect: round },
        plugins: {
          legend: { display: o.legend ?? (datasets.length > 1 || round), position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 14 } },
          title: o.title ? { display: true, text: o.title, color: cssv('--text') || '#0f172a', font: { size: 13, weight: '600' }, padding: { bottom: 10 } } : { display: false },
          tooltip: o.tooltip || {}
        },
        scales: round ? {} : {
          x: { grid: { display: false }, title: { display: !!o.xTitle, text: o.xTitle }, ticks: { maxRotation: 0, autoSkip: true } },
          y: { beginAtZero: true, title: { display: !!o.yTitle, text: o.yTitle }, ticks: { precision: o.precision ?? 0, callback: o.yFormat }, ...(o.indexAxis === 'y' ? { grid: { display: true } } : {}) }
        },
        cutout: type === 'doughnut' ? '64%' : undefined,
        onHover: o.onPick ? (e, els) => { e.native.target.style.cursor = els.length ? 'pointer' : 'default'; } : undefined,
        onClick: o.onPick ? (e, els) => { if (els.length) o.onPick(els[0].index, labels[els[0].index]); } : undefined
      }
    };
    if (o.extra) Object.assign(cfg.options, o.extra);
    cache[id] = new Chart(canvas, cfg);
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', o.title || o.label || 'Chart');
    return cache[id];
  }
  return { make };
})();
