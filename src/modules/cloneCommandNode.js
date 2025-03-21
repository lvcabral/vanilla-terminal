export default (el) => {
  const line = el.cloneNode(true);
  const input = line.querySelector('.input');

  input.autofocus = false;
  input.readOnly = true;
  input.insertAdjacentHTML('beforebegin', `<p>${input.value}</p>`);
  input.parentNode.removeChild(input);
  line.classList.add('line');

  return line;
};
