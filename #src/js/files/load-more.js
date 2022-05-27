const loadmore = document.querySelector('#loadmore');
  let currentItems = 6;
  loadmore.addEventListener('click', (e) => {
    const elementList = [...document.querySelectorAll('.news-grid-block__item')];
    for (let i = currentItems; i < currentItems + 2; i++) {
      if (elementList[i]) {
        elementList[i].style.display = 'grid';
      }
    }
    currentItems += 2;

    if (currentItems >= elementList.length) {
      event.target.style.display = 'none';
    }
});