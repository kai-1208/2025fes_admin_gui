// app.js
const API_BASE_URL = 'https://semirarely-expositional-aria.ngrok-free.dev'; // ngrokのURL
const QUEST_API_KEY = '2025quest-api-key';

// ----- DOM要素の取得 -----
const userInfoContainer = document.getElementById('user-info-container');
const updateFormContainer = document.getElementById('update-form-container');
const updateForm = document.getElementById('update-form');
const messageContainer = document.getElementById('message-container');
const userIdEl = document.getElementById('userId');
const userNameEl = document.getElementById('userName');
const currentFlagsEl = document.getElementById('currentFlags');

let currentUserId = null;

// ----- メイン処理 -----

// ページが読み込まれたら、URLパラメータを元に初期化処理を開始
window.addEventListener('DOMContentLoaded', handleInitialLoad);

// フォームが送信されたときの処理
updateForm.addEventListener('submit', handleUpdateFlag);


// ----- 関数定義 -----

/**
 * ページの初期化処理
 */
async function handleInitialLoad() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const pass = params.get('pass');

  if (!id || !pass) {
    showMessage('エラー: QRコードからアクセスしてください。', 'error');
    return;
  }

  // ① QRコードの情報でログイン
  const loginData = await loginUser(id, pass);
  if (!loginData) {
    // ログイン失敗のメッセージはloginUser関数内で表示される
    return;
  }

  // ② ログイン成功後、ユーザー情報を表示
  const user = loginData.user;
  currentUserId = user.id; // 更新処理で使うためIDを保持
  displayUserInfo(user);
}

/**
 * ユーザーのログイン処理
 * @param {string} id ユーザーID
 * @param {string} pass パスワード
 * @returns {object|null} ログイン成功時はdataオブジェクト、失敗時はnull
 */
async function loginUser(id, pass) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, pass }),
    });

    const result = await response.json();

    if (result.status !== 'success') {
      throw new Error(result.message || 'ログインに失敗しました。');
    }
    
    showMessage('ユーザー認証に成功しました。', 'success');
    return result.data;
  } catch (error) {
    showMessage(`エラー: ${error.message}`, 'error');
    return null;
  }
}

/**
 * フラグ更新フォームの送信処理
 * @param {Event} event フォームのsubmitイベント
 */
async function handleUpdateFlag(event) {
  event.preventDefault(); // ページの再読み込みを防止

  if (!currentUserId) {
    showMessage('エラー: ユーザー情報がありません。', 'error');
    return;
  }

  const flagName = document.getElementById('flagName').value;
  const increment = parseInt(document.getElementById('increment').value, 10);

  if (!flagName || isNaN(increment)) {
    showMessage('エラー: フラグ名と加算する値を正しく入力してください。', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/users/update-flag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': QUEST_API_KEY, // ★クエスト用APIキーをヘッダーに含める
      },
      body: JSON.stringify({
        userId: currentUserId,
        flagName,
        increment,
      }),
    });

    const result = await response.json();

    if (result.status !== 'success') {
      throw new Error(result.message || 'フラグの更新に失敗しました。');
    }
    
    // 画面のフラグ表示を更新
    displayFlags(result.data.updatedFlags);
    showMessage(`成功: フラグ「${flagName}」を${increment}加算しました。`, 'success');

  } catch (error) {
    showMessage(`エラー: ${error.message}`, 'error');
  }
}

/**
 * 画面にユーザー情報を表示する
 * @param {object} user ユーザーオブジェクト
 */
function displayUserInfo(user) {
  userIdEl.textContent = user.id;
  userNameEl.textContent = user.name;
  displayFlags(user.flags);
  userInfoContainer.classList.remove('hidden');
  updateFormContainer.classList.remove('hidden');
}

/**
 * 画面にフラグ情報を表示する
 * @param {object} flags フラグオブジェクト
 */
function displayFlags(flags) {
  currentFlagsEl.textContent = JSON.stringify(flags, null, 2);
}

/**
 * 画面にメッセージを表示する
 * @param {string} text 表示するメッセージ
 * @param {'success'|'error'} type メッセージの種類
 */
function showMessage(text, type) {
  messageContainer.textContent = text;
  messageContainer.className = type === 'success' ? 'message-success' : 'message-error';
}