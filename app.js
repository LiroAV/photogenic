const STORAGE_KEY = "photogenic.albums.v1";
const CHALLENGE_KEY = "photogenic.challengeOffset.v1";

const retroColors = {
  "#d66f6f": "#9c615e",
  "#6f9a86": "#627e70",
  "#87a9cf": "#677f99",
};

const samplePhotos = {
  friends: [
    "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?auto=format&fit=crop&w=900&q=80",
  ],
  holidays: [
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1491555103944-7c647fd857e6?auto=format&fit=crop&w=900&q=80",
  ],
  university: [
    "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1519452635265-7b1fbfd1e4e0?auto=format&fit=crop&w=900&q=80",
  ],
};

const promptParts = {
  verbs: ["Catch", "Frame", "Find", "Follow", "Save", "Notice", "Collect"],
  details: ["a quiet shadow", "something blue", "a tiny ritual", "a reflection", "soft morning light", "a happy mess", "two matching shapes"],
  moods: ["before it disappears", "from knee height", "with extra calm", "near a window", "on your walk", "like a postcard", "in one minute"],
};

let state = loadState();
let activeAlbumId = state.activeAlbumId ?? state.albums[0]?.id;
let spreadIndex = 0;
let isOpen = false;

const elements = {
  dailyChallenge: document.querySelector("#dailyChallenge"),
  refreshChallenge: document.querySelector("#refreshChallenge"),
  albumList: document.querySelector("#albumList"),
  albumForm: document.querySelector("#albumForm"),
  showAlbumForm: document.querySelector("#showAlbumForm"),
  albumName: document.querySelector("#albumName"),
  albumColor: document.querySelector("#albumColor"),
  albumMeta: document.querySelector("#albumMeta"),
  albumTitle: document.querySelector("#albumTitle"),
  activeAlbumColor: document.querySelector("#activeAlbumColor"),
  deleteAlbum: document.querySelector("#deleteAlbum"),
  photoBook: document.querySelector("#photoBook"),
  bookCover: document.querySelector("#bookCover"),
  bookSpread: document.querySelector("#bookSpread"),
  coverTitle: document.querySelector("#coverTitle"),
  coverCount: document.querySelector("#coverCount"),
  toggleBook: document.querySelector("#toggleBook"),
  prevPage: document.querySelector("#prevPage"),
  nextPage: document.querySelector("#nextPage"),
  cameraInput: document.querySelector("#cameraInput"),
  uploadInput: document.querySelector("#uploadInput"),
  photoTemplate: document.querySelector("#photoTemplate"),
};

render();
wireEvents();
registerServiceWorker();

function wireEvents() {
  elements.showAlbumForm.addEventListener("click", () => {
    elements.albumForm.classList.toggle("hidden");
    if (!elements.albumForm.classList.contains("hidden")) {
      elements.albumName.focus();
    }
  });

  elements.albumForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = elements.albumName.value.trim();
    if (!name) return;

    const album = {
      id: makeId(),
      name,
      color: elements.albumColor.value,
      photos: [],
      createdAt: new Date().toISOString(),
    };

    state.albums.unshift(album);
    activeAlbumId = album.id;
    spreadIndex = 0;
    isOpen = true;
    elements.albumForm.reset();
    elements.albumColor.value = album.color;
    elements.albumForm.classList.add("hidden");
    saveState();
    render();
  });

  elements.albumList.addEventListener("click", (event) => {
    const tile = event.target.closest("[data-album-id]");
    if (!tile) return;
    activeAlbumId = tile.dataset.albumId;
    spreadIndex = 0;
    isOpen = false;
    saveState();
    render();
  });

  elements.toggleBook.addEventListener("click", () => {
    isOpen = !isOpen;
    renderBookState();
  });

  elements.bookCover.addEventListener("click", () => {
    if (!isOpen) {
      isOpen = true;
      renderBookState();
    }
  });

  elements.prevPage.addEventListener("click", () => turnPage(-1));
  elements.nextPage.addEventListener("click", () => turnPage(1));

  elements.activeAlbumColor.addEventListener("input", (event) => {
    const album = getActiveAlbum();
    if (!album) return;
    album.color = event.target.value;
    saveState();
    renderAlbumList();
    renderAlbumDetails();
  });

  elements.deleteAlbum.addEventListener("click", () => {
    const album = getActiveAlbum();
    if (!album || state.albums.length === 1) return;

    state.albums = state.albums.filter((item) => item.id !== album.id);
    activeAlbumId = state.albums[0]?.id;
    spreadIndex = 0;
    isOpen = false;
    saveState();
    render();
  });

  elements.cameraInput.addEventListener("change", (event) => addPhotoFromInput(event.target));
  elements.uploadInput.addEventListener("change", (event) => addPhotoFromInput(event.target));

  elements.refreshChallenge.addEventListener("click", () => {
    const offset = Number(localStorage.getItem(CHALLENGE_KEY) ?? 0) + 1;
    localStorage.setItem(CHALLENGE_KEY, String(offset));
    renderChallenge();
  });

  window.addEventListener("resize", () => {
    renderSpread();
  });
}

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored?.albums?.length) return migrateStoredState(stored);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }

  const now = new Date().toISOString();
  return {
    activeAlbumId: "friends",
    albums: [
      {
        id: "friends",
        name: "Friends",
        color: "#9c615e",
        createdAt: now,
        photos: samplePhotos.friends.map((src, index) => makePhoto(src, ["After class", "Late sunlight", "Laugh break"][index])),
      },
      {
        id: "holidays",
        name: "Holidays",
        color: "#627e70",
        createdAt: now,
        photos: samplePhotos.holidays.map((src, index) => makePhoto(src, ["A slow view", "On the road", "Golden hour"][index])),
      },
      {
        id: "university",
        name: "University",
        color: "#677f99",
        createdAt: now,
        photos: samplePhotos.university.map((src, index) => makePhoto(src, ["Library pause", "Campus morning", "Notebook weather"][index])),
      },
    ],
  };
}

function migrateStoredState(stored) {
  let changed = false;
  stored.albums = stored.albums.map((album) => {
    const color = retroColors[album.color?.toLowerCase()];
    if (!color) return album;
    changed = true;
    return { ...album, color };
  });

  if (changed) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }

  return stored;
}

function makePhoto(src, caption) {
  return {
    id: makeId(),
    src,
    caption,
    createdAt: new Date().toISOString(),
  };
}

function saveState() {
  state.activeAlbumId = activeAlbumId;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  renderChallenge();
  renderAlbumList();
  renderAlbumDetails();
  renderSpread();
  renderBookState();
}

function renderChallenge() {
  const todayKey = new Date().toISOString().slice(0, 10);
  const offset = Number(localStorage.getItem(CHALLENGE_KEY) ?? 0);
  const seed = [...todayKey].reduce((sum, char) => sum + char.charCodeAt(0), offset);
  const verb = pick(promptParts.verbs, seed);
  const detail = pick(promptParts.details, seed * 3);
  const mood = pick(promptParts.moods, seed * 7);
  elements.dailyChallenge.textContent = `${verb} ${detail} ${mood}.`;
}

function pick(list, seed) {
  return list[Math.abs(seed) % list.length];
}

function renderAlbumList() {
  elements.albumList.innerHTML = "";

  state.albums.forEach((album) => {
    const button = document.createElement("button");
    button.className = `album-tile${album.id === activeAlbumId ? " active" : ""}`;
    button.type = "button";
    button.dataset.albumId = album.id;
    button.style.setProperty("--album-color", album.color);
    button.innerHTML = `
      <strong>${escapeHtml(album.name)}</strong>
      <span>${photoCountLabel(album.photos.length)}</span>
    `;
    elements.albumList.append(button);
  });
}

function renderAlbumDetails() {
  const album = getActiveAlbum();
  if (!album) return;

  elements.albumTitle.textContent = album.name;
  elements.albumMeta.textContent = photoCountLabel(album.photos.length);
  elements.coverTitle.textContent = album.name;
  elements.coverCount.textContent = photoCountLabel(album.photos.length);
  elements.activeAlbumColor.value = album.color;
  elements.photoBook.style.setProperty("--cover-color", album.color);
  elements.deleteAlbum.disabled = state.albums.length === 1;
  elements.deleteAlbum.title = state.albums.length === 1 ? "Keep one album on the shelf" : "";
}

function renderSpread() {
  const album = getActiveAlbum();
  if (!album) return;

  const photosPerSpread = getPhotosPerSpread();
  const maxSpread = Math.max(0, Math.ceil(album.photos.length / photosPerSpread) - 1);
  spreadIndex = Math.min(spreadIndex, maxSpread);
  const visible = album.photos.slice(spreadIndex * photosPerSpread, spreadIndex * photosPerSpread + photosPerSpread);
  elements.bookSpread.innerHTML = "";

  if (!visible.length) {
    const empty = document.createElement("div");
    empty.className = "empty-page";
    empty.innerHTML = `
      <p class="eyebrow">Blank page</p>
      <h3>Start here.</h3>
      <p>${escapeHtml(elements.dailyChallenge.textContent)}</p>
    `;
    elements.bookSpread.append(empty);
  }

  visible.forEach((photo) => {
    const node = elements.photoTemplate.content.firstElementChild.cloneNode(true);
    const image = node.querySelector("img");
    const caption = node.querySelector("figcaption");
    image.src = photo.src;
    image.alt = photo.caption ? `${photo.caption} photo` : "Album photo";
    caption.textContent = photo.caption || formatPhotoDate(photo.createdAt);
    elements.bookSpread.append(node);
  });

  elements.prevPage.disabled = spreadIndex === 0;
  elements.nextPage.disabled = spreadIndex >= maxSpread;
}

function renderBookState() {
  elements.photoBook.classList.toggle("open", isOpen);
  elements.toggleBook.textContent = isOpen ? "Close album" : "Open album";
}

function turnPage(direction) {
  const album = getActiveAlbum();
  if (!album) return;

  const maxSpread = Math.max(0, Math.ceil(album.photos.length / getPhotosPerSpread()) - 1);
  const nextIndex = Math.max(0, Math.min(maxSpread, spreadIndex + direction));
  if (nextIndex === spreadIndex) return;

  isOpen = true;
  elements.bookSpread.classList.add("turning");
  window.setTimeout(() => {
    spreadIndex = nextIndex;
    renderSpread();
    renderBookState();
    elements.bookSpread.classList.remove("turning");
  }, 190);
}

async function addPhotoFromInput(input) {
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;

  const album = getActiveAlbum();
  if (!album) return;

  try {
    const src = await fileToResizedDataUrl(file);
    album.photos.unshift(makePhoto(src, elements.dailyChallenge.textContent));
    spreadIndex = 0;
    isOpen = true;
    saveState();
    render();
  } catch (error) {
    console.error(error);
    alert("That photo could not be added. Try a smaller image.");
  }
}

function fileToResizedDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const maxSize = 1400;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const width = Math.round(image.width * scale);
        const height = Math.round(image.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function getActiveAlbum() {
  return state.albums.find((album) => album.id === activeAlbumId) ?? state.albums[0];
}

function getPhotosPerSpread() {
  return window.matchMedia("(max-width: 640px)").matches ? 1 : 2;
}

function photoCountLabel(count) {
  return `${count} ${count === 1 ? "photo" : "photos"}`;
}

function formatPhotoDate(value) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

function escapeHtml(value) {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}

function makeId() {
  return crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
