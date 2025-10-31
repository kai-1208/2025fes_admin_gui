// app.js
const API_BASE_URL = 'https://semirarely-expositional-aria.ngrok-free.dev'; // ngrokのURL
const QUEST_API_KEY = '2025quest-api-key';

// ----- DOM要素の取得 -----
const scannerContainer = document.getElementById('scanner-container');
const qrReaderEl = document.getElementById('qr-reader');
const startScanBtn = document.getElementById('start-scan-btn');
const manualLoginContainer = document.getElementById('manual-login-container');
const manualLoginForm = document.getElementById('manual-login-form');
const userInfoContainer = document.getElementById('user-info-container');
const updateFormContainer = document.getElementById('update-form-container');
const updateForm = document.getElementById('update-form');
const messageContainer = document.getElementById('message-container');
const userIdEl = document.getElementById('userId');
const userNameEl = document.getElementById('userName');
const currentFlagsEl = document.getElementById('currentFlags');

let currentUserId = null;
let html5QrCode = null;

// ----- メイン処理 -----

// ページが読み込まれたときの初期化
window.addEventListener('DOMContentLoaded', () => {
  // スキャナーインスタンスを生成
  html5QrCode = new Html5Qrcode("qr-reader");
});

// 「QRスキャンを開始」ボタンが押されたときの処理
startScanBtn.addEventListener('click', startScanner);

// ページが読み込まれたら、URLパラメータをチェックして処理を振り分ける
window.addEventListener('DOMContentLoaded', handleInitialLoad);

// 手動ログインフォームが送信されたときの処理
manualLoginForm.addEventListener('submit', handleManualLogin);

// フラグ更新フォームが送信されたときの処理
updateForm.addEventListener('submit', handleUpdateFlag);


// ----- 関数定義 -----

/**
 * QRコードスキャナーを起動する
 */
function startScanner() {
  showMessage('カメラを起動しています...', 'success');
  qrReaderEl.classList.add('scanning');
  startScanBtn.disabled = true;

  const qrCodeSuccessCallback = (decodedText, decodedResult) => {
    // QRコードの読み取りに成功したときの処理
    html5QrCode.stop().then(() => {
      qrReaderEl.classList.remove('scanning');
      startScanBtn.disabled = false;
      showMessage('QRコードを読み取りました。認証中...', 'success');
      
      try {
        const url = new URL(decodedText);
        const id = url.searchParams.get('id');
        const pass = url.searchParams.get('pass');
        
        if (id && pass) {
          processLogin(id, pass);
        } else {
          throw new Error('QRコードにidまたはpassが含まれていません。');
        }
      } catch (error) {
        showMessage(`エラー: 無効なQRコードです。(${error.message})`, 'error');
      }
    });
  };

  const config = { fps: 10, qrbox: { width: 250, height: 250 } };

  // カメラを起動
  // { facingMode: "environment" } で背面カメラを優先
  html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback)
    .catch(err => {
      showMessage(`エラー: カメラを起動できませんでした。(${err})`, 'error');
      qrReaderEl.classList.remove('scanning');
      startScanBtn.disabled = false;
    });
}

/**
 * ページの初期化処理。URLパラメータの有無で動作を切り替える。
 */
function handleInitialLoad() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const pass = params.get('pass');

  if (id && pass) {
    // QRコード経由のアクセス：自動でログイン処理を開始
    manualLoginContainer.classList.add('hidden'); // 手動フォームは隠す
    processLogin(id, pass);
  } else {
    // 直接アクセス：手動ログインフォームを表示したまま待機
    showMessage('QRコードをスキャンするか、IDとPASSを手動で入力してください。', 'success');
  }
}

/**
 * 手動ログインフォームの送信を処理
 * @param {Event} event フォームのsubmitイベント
 */
function handleManualLogin(event) {
  event.preventDefault();
  const id = document.getElementById('manualId').value;
  const pass = document.getElementById('manualPass').value;
  if (id && pass) {
    processLogin(id, pass);
  } else {
    showMessage('エラー: IDとPASSを両方入力してください。', 'error');
  }
}

/**
 * ログイン処理の本体
 * @param {string} id ユーザーID
 * @param {string} pass パスワード
 */
async function processLogin(id, pass) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, pass }),
    });
    console.log('API Response Status:', response.status); 
    
    const result = await response.json();

    console.log('API Response Body:', result);

    if (result.status !== 'success') {
      throw new Error(result.message || 'ログインに失敗しました。');
    }

    showMessage('ユーザー認証に成功しました。', 'success');
    const user = result.data.user;
    currentUserId = user.id;
    displayUserInfo(user);
    
    // ログイン成功後、手動フォームを隠して更新フォームを表示
    scannerContainer.classList.add('hidden');
    manualLoginContainer.classList.add('hidden');
    userInfoContainer.classList.remove('hidden');
    updateFormContainer.classList.remove('hidden');

  } catch (error) {
    showMessage(`エラー: ${error.message}`, 'error');
  }
}

/**
 * フラグ更新フォームの送信処理 (内容は以前と同じ)
 * @param {Event} event フォームのsubmitイベント
 */
async function handleUpdateFlag(event) {
  event.preventDefault();
  if (!currentUserId) { return; }

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
        'x-api-key': QUEST_API_KEY,
      },
      body: JSON.stringify({ userId: currentUserId, flagName, increment }),
    });
    const result = await response.json();
    if (result.status !== 'success') {
      throw new Error(result.message || 'フラグの更新に失敗しました。');
    }
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
}

/**
 * 画面にフラグ情報を表示する
 * @param {object} flags フラグオブジェクト
 */
function displayFlags(flags) {
  currentFlagsEl.textContent = JSON.stringify(flags, null, 2) || '{}';
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