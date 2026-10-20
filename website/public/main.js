const switches = document.querySelector('.demo-switch');
const buttons = [...switches.querySelectorAll('button')];
switches.hidden = false;
for (const button of buttons) {
  button.addEventListener('click', () => {
    for (const item of buttons) {
      const selected = item === button;
      item.setAttribute('aria-pressed', String(selected));
      document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
    }
  });
}
