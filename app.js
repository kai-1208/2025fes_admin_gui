// app.js
const API_BASE_URL = 'https://semirarely-expositional-aria.ngrok-free.dev'; // ngrokのURL
const QUEST_API_KEY = '2025quest-api-key';

// ----- フラグ定義 (フロントエンド用) -----
const flagDefinitions = {
  casino: [
    { name: 'casino_played', label: 'カジノをプレイした数'},
    { name: 'casino_roulette_played', label: 'ルーレットをプレイした数' },
    { name: 'casino_poker_played', label: 'ポーカーをプレイした数' },
    { name: 'casino_blackjack_played', label: 'ブラックジャックをプレイした数' },
    { name: 'casino_coins_earned', label: 'コインを稼いだ量' },
    { name: 'casino_losses', label: '負けた数' },
  ],
  dungeon: [
    { name: 'dungeon_played', label: 'ダンジョンをプレイした数'},
    { name: 'dungeon_enemies_defeated', label: '敵を倒した数' },
    { name: 'dungeon_chests_opened', label: '宝箱を見つけた数' },
    { name: 'dungeon_player_deaths', label: '倒れた数' },
    { name: 'dungeon_floors_cleared', label: '階層を突破した数' },
  ],
  code_editor: [
    { name: 'code_editor_played', label: 'コードエディターをプレイした数'},
    { name: 'code_problems_solved', label: '問題を解いた数' },
    { name: 'code_failures', label: '失敗した数' },
    { name: 'code_solo_clears', label: '1人でクリアした数' },
  ]
};

// ----- DOM要素の取得 -----
const loginMethodContainer = document.getElementById('login-method-container');
const qrReaderEl = document.getElementById('qr-reader');
const startScanBtn = document.getElementById('start-scan-btn');
const manualLoginForm = document.getElementById('manual-login-form');
const resetBtn = document.getElementById('reset-btn');
const userInfoContainer = document.getElementById('user-info-container');
const updateFormContainer = document.getElementById('update-form-container');
const updateForm = document.getElementById('update-form');
const gameCategorySelect = document.getElementById('game-category-select');
const dynamicInputsContainer = document.getElementById('dynamic-inputs-container');
const updateSubmitBtn = document.getElementById('update-submit-btn');
const messageContainer = document.getElementById('message-container');
const userIdEl = document.getElementById('userId');
const userNameEl = document.getElementById('userName');
const userExpEl = document.getElementById("userExp");
const currentFlagsEl = document.getElementById('currentFlags');

let currentUserId = null;
let html5QrCode = null;

// ----- イベントリスナー -----
window.addEventListener('DOMContentLoaded', () => {
  html5QrCode = new Html5Qrcode("qr-reader");
});
startScanBtn.addEventListener('click', startScanner);
manualLoginForm.addEventListener('submit', handleManualLogin);
resetBtn.addEventListener('click', resetToInitialState);
gameCategorySelect.addEventListener('change', renderDynamicInputs);
updateForm.addEventListener('submit', handleUpdateFlags);


// ----- 関数定義 -----

/**
 * 初期状態（ログイン前）に戻す
 */
function resetToInitialState() {
  currentUserId = null;
  userInfoContainer.classList.add('hidden');
  updateFormContainer.classList.add('hidden');
  loginMethodContainer.classList.remove('hidden'); // QRと手動入力フォームを表示
  
  gameCategorySelect.value = '';
  renderDynamicInputs();

  showMessage('', 'success');
}

/**
 * QRコードスキャナーを起動する
 */
function startScanner() {
  showMessage('カメラを起動しています...', 'success');
  qrReaderEl.classList.add('scanning');
  startScanBtn.disabled = true;

  const qrCodeSuccessCallback = (decodedText) => {
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

  html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback)
    .catch(err => {
      showMessage(`エラー: カメラを起動できませんでした。(${err})`, 'error');
      qrReaderEl.classList.remove('scanning');
      startScanBtn.disabled = false;
    });
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
        const result = await response.json();
        if (result.status !== 'success') {
          throw new Error(result.message || 'ログインに失敗しました。');
        }

        const user = result.data.user;
        currentUserId = user.id;

        // UIの状態を更新（ログイン後）
        loginMethodContainer.classList.add('hidden'); // ログイン方法選択エリアを隠す
        userInfoContainer.classList.remove('hidden');
        updateFormContainer.classList.remove('hidden');
        displayUserInfo(user);
        showMessage('ユーザー認証成功。カテゴリを選択してください。', 'success');

    } catch (error) {
        showMessage(`エラー: ${error.message}`, 'error');
        resetToInitialState();
    }
}

/**
 * 選択されたカテゴリに応じて入力欄を動的に生成
 */
function renderDynamicInputs() {
  const category = gameCategorySelect.value;
  dynamicInputsContainer.innerHTML = '';

  if (!category) {
    updateSubmitBtn.classList.add('hidden');
    return;
  }

  const definitions = flagDefinitions[category];
  definitions.forEach(def => {
    const group = document.createElement('div');
    group.className = 'dynamic-input-group';
    const label = document.createElement('label');
    label.htmlFor = `input-${def.name}`;
    label.textContent = def.label;
    const input = document.createElement('input');
    input.type = 'number';
    input.id = `input-${def.name}`;
    input.dataset.flagName = def.name;
    input.placeholder = '加算値';
    input.value = '1';
    input.step = '1';
    group.appendChild(label);
    group.appendChild(input);
    dynamicInputsContainer.appendChild(group);
  });
  
  updateSubmitBtn.classList.remove('hidden');
}

/**
 * 複数フラグの更新処理
 * @param {Event} event フォームのsubmitイベント
 */
async function handleUpdateFlags(event) {
    event.preventDefault();
    if (!currentUserId) return;

    const updates = [];
    const inputs = dynamicInputsContainer.querySelectorAll('input[type="number"]');

    inputs.forEach(input => {
        const value = parseInt(input.value, 10);
        if (!isNaN(value) && value !== 0) {
            updates.push({
                flagName: input.dataset.flagName,
                increment: value
            });
        }
    });

    if (updates.length === 0) {
        showMessage('更新する値が入力されていません。', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/users/update-flag`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': QUEST_API_KEY },
            body: JSON.stringify({ userId: currentUserId, updates }),
        });
        const result = await response.json();
        if (result.status !== 'success') {
          throw new Error(result.message || 'フラグの更新に失敗しました。');
        }
        
        displayFlags(result.data.updatedFlags);
        showMessage('フラグの更新に成功しました！', 'success');
        
        gameCategorySelect.value = '';
        renderDynamicInputs();

    } catch (error) {
        showMessage(`エラー: ${error.message}`, 'error');
    }
}

/**
 * 画面にユーザー情報を表示する
 * @param {object} user ユーザーオブジェクト
 */
// function displayUserInfo(user) {
  
//   displayFlags(user.flags);
// }

/**
 * ユーザー情報とクエスト情報をHTML要素に反映させる関数
 * @param {object} data - APIから返されたdataオブジェクト (userとactiveQuestsを含む)
 */
function displayUserInfo(data) {
  const { user, activeQuests } = data;

  // 基本情報を表示
  userIdEl.textContent = user.id;
  userNameEl.textContent = user.name;
  userExpEl.textContent = user.experience;

  // ★ 各カテゴリのクエスト情報を表示
  displayQuestProgress('dungeon', activeQuests.dungeon);
  displayQuestProgress('casino', activeQuests.casino);
  displayQuestProgress('code_editor', activeQuests.code_editor);
}

/**
 * 個別のクエストの進捗を表示するヘルパー関数
 * @param {string} category - 'dungeon', 'casino', 'code_editor'
 * @param {object|null} questData - activeQuestsから取得したクエスト情報
 */
function displayQuestProgress(category, questData) {
  const textEl = document.getElementById(`${category}-quest-text`);
  const rewardEl = document.getElementById(`${category}-quest-reward`);

  if (!questData) {
    // クエストがnullの場合（全クリなど）
    textEl.textContent = '全てのクエストを達成しました！';
    rewardEl.textContent = '素晴らしい冒険でした！';
    return;
  }

  // クエストの表示テキストを生成
  // この部分は、targetFlagに応じて日本語を出し分ける
  let questObjectiveText = '';
  switch(questData.targetFlag) {
    case 'dungeon_enemies_defeated':
      questObjectiveText = `敵を倒す`; break;
    case 'dungeon_chests_opened':
      questObjectiveText = `宝箱を見つける`; break;
    case 'casino_coins_earned':
      questObjectiveText = `コインを稼ぐ`; break;
    // ... 他のすべてのtargetFlagに対応する日本語を追加 ...
    default:
      questObjectiveText = '目標を達成する';
  }

  // 進捗と報酬のテキストを組み立てて表示
  textEl.innerHTML = `<strong>Lv.${questData.level}:</strong> ${questObjectiveText} <br> (${questData.currentProgress} / ${questData.targetValue})`;
  rewardEl.textContent = `報酬: ${questData.rewardCurrency}G / ${questData.rewardExperience}EXP`;
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