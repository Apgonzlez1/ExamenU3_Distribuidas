const socket = io();

document.getElementById('formIdea').addEventListener('submit', (e) => {
  e.preventDefault();
  const idea = document.getElementById('idea').value.trim();
  if (idea !== '') {
    socket.emit('nueva_idea', idea);
    document.getElementById('idea').value = '';
  }
});

socket.on('ideas', (lista) => {
  const contenedor = document.getElementById('listaIdeas');
  contenedor.innerHTML = '';
  lista.forEach(idea => {
    const li = document.createElement('li');
    li.textContent = idea;
    contenedor.appendChild(li);
  });
});
