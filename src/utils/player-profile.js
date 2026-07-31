/**
 * Player Profile Utility — Custom Nickname Storage & Default Name Generator
 */

const PLAYER_NAME_KEY = 'carrot_player_nickname';

const ADJECTIVES = ['幸運', '淘氣', '聰明', '憨厚', '機智', '開心', '勇敏', '快樂', '呆萌', '霸氣'];
const NOUNS = ['蘿蔔', '兔兔', '貓咪', '熊熊', '狐狸', '小鹿', '小鷹', '熊貓', '柴犬', '小鴨'];

function generateDefaultName() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${adj}${noun} #${num}`;
}

export function getPlayerName() {
  try {
    const name = localStorage.getItem(PLAYER_NAME_KEY);
    if (name && name.trim()) return name.trim().slice(0, 16);
  } catch (e) {}

  const defaultName = generateDefaultName();
  setPlayerName(defaultName);
  return defaultName;
}

export function setPlayerName(name) {
  if (!name || !name.trim()) return getPlayerName();
  const clean = name.trim().slice(0, 16);
  try {
    localStorage.setItem(PLAYER_NAME_KEY, clean);
  } catch (e) {}
  return clean;
}
