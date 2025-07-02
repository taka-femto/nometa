import React, { useState } from 'react';
import './App.css';

function App() {
  // Google Apps Script エンドポイント
  const API_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwqlfdenxrpX0Wf6TqfMWIvJh1CcoTN6WKiAgSwIiPw91Xt52s5NQ9v3W5O754BPJGu/exec';
  
  // 今日の日付を取得
  const today = new Date();
  
  // 認証関連の状態
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  
  // 既存の状態管理
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [takenDays, setTakenDays] = useState(new Map());
  const [memos, setMemos] = useState(new Map());
  const [startDate, setStartDate] = useState(null);
  const [reminderTime, setReminderTime] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isLutevitaSelected, setIsLutevitaSelected] = useState(false);
  const [isCustomSelected, setIsCustomSelected] = useState(false);
  const [customSupplementName, setCustomSupplementName] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [currentMemo, setCurrentMemo] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // 認証状態をチェック
  const checkAuthStatus = () => {
    const authToken = localStorage.getItem('nonda-auth-token');
    const loginDate = localStorage.getItem('nonda-login-date');
    const autoLogin = localStorage.getItem('nonda-auto-login');
    
    if (authToken && loginDate && autoLogin === 'true') {
      const loginDateTime = new Date(loginDate);
      const now = new Date();
      const daysDiff = Math.floor((now - loginDateTime) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 30) {
        // 30日以内なら自動ログイン
        setIsAuthenticated(true);
        const savedEmail = localStorage.getItem('nonda-user-email');
        const savedName = localStorage.getItem('nonda-username');
        if (savedEmail) setUserEmail(savedEmail);
        if (savedName) setUserName(savedName);
        return true;
      } else {
        // 期限切れなので認証データを削除
        clearAuthData();
      }
    }
    
    return false;
  };

  // 認証データをクリア
  const clearAuthData = () => {
    localStorage.removeItem('nonda-auth-token');
    localStorage.removeItem('nonda-login-date');
    localStorage.removeItem('nonda-auto-login');
    setIsAuthenticated(false);
    setAuthEmail('');
    setPinCode('');
  };

  // PIN送信
  const sendPinCode = async (email) => {
    setLoginLoading(true);
    setAuthError('');
    
    try {
      console.log('PIN送信開始:', email);
      
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'sendPin',
          email: email
        })
      });
      
      console.log('レスポンス状況:', response.status);
      const data = await response.json();
      console.log('レスポンスデータ:', data);
      
      if (data.success) {
        setAuthEmail(email);
        setShowLogin(false);
        setShowPinInput(true);
        alert('PINコードを送信しました。メールボックス（迷惑メールフォルダも含む）をご確認ください。');
      } else {
        setAuthError(data.message || 'PIN送信に失敗しました');
      }
    } catch (error) {
      console.error('PIN送信エラー:', error);
      setAuthError('ネットワークエラーが発生しました。Google Apps Scriptの設定を確認してください。');
    } finally {
      setLoginLoading(false);
    }
  };

  // PIN認証
  const verifyPinCode = async () => {
    setLoginLoading(true);
    setAuthError('');
    
    try {
      console.log('PIN認証開始:', authEmail, 'PIN:', pinCode);
      
      // 実際のAPI認証
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          action: 'verifyPin',
          email: authEmail,
          pin: pinCode
        })
      });
      
      console.log('認証レスポンス状況:', response.status);
      const data = await response.json();
      console.log('認証レスポンスデータ:', data);
      
      if (data.success) {
        // 認証成功
        const authToken = 'auth-' + Date.now();
        const loginDate = new Date().toISOString();
        
        localStorage.setItem('nonda-auth-token', authToken);
        localStorage.setItem('nonda-login-date', loginDate);
        localStorage.setItem('nonda-auto-login', 'true');
        
        setIsAuthenticated(true);
        setShowPinInput(false);
        setPinCode('');
        
        // ユーザーデータの同期
        if (data.userData) {
          syncUserData(data.userData);
        } else {
          // 新規ユーザーの場合
          setShowWelcome(true);
        }
      } else {
        setAuthError(data.message || 'PIN認証に失敗しました');
      }
    } catch (error) {
      console.error('PIN認証エラー:', error);
      setAuthError('ネットワークエラーが発生しました。しばらくしてから再度お試しください。');
    } finally {
      setLoginLoading(false);
    }
  };

  // ユーザーデータを同期
  const syncUserData = (userData) => {
    if (userData.name) {
      setUserName(userData.name);
      localStorage.setItem('nonda-username', userData.name);
    }
    
    if (userData.email) {
      setUserEmail(userData.email);
      localStorage.setItem('nonda-user-email', userData.email);
    }
    
    // その他のデータも同期可能
    if (userData.takenDays) {
      // サーバーからの服薬記録を復元
      const mapData = new Map();
      for (const [key, value] of Object.entries(userData.takenDays)) {
        mapData.set(key, new Set(value));
      }
      setTakenDays(mapData);
    }
    
    if (userData.startDate) {
      setStartDate(new Date(userData.startDate));
      localStorage.setItem('nonda-start-date', userData.startDate);
    }
  };

  // ログアウト
  const handleLogout = () => {
    if (window.confirm('ログアウトしますか？次回ログイン時にPIN認証が必要になります。')) {
      clearAuthData();
      setShowLogin(true);
      // データは端末に残す（ローカルストレージは維持）
    }
  };

  // ログイン処理
  const handleLogin = () => {
    const emailInput = document.getElementById('login-email-input').value;
    
    if (!emailInput.trim()) {
      setAuthError('メールアドレスを入力してください');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput.trim())) {
      setAuthError('正しいメールアドレスを入力してください');
      return;
    }
    
    sendPinCode(emailInput.trim());
  };

  // PIN入力処理
  const handlePinSubmit = () => {
    if (pinCode.length !== 6) {
      setAuthError('6桁のPINコードを入力してください');
      return;
    }
    
    verifyPinCode();
  };

  // 初回起動時にデータを読み込み
  React.useEffect(() => {
    // 認証状態をチェック
    const isLoggedIn = checkAuthStatus();
    
    if (!isLoggedIn) {
      // 未認証の場合はログイン画面を表示
      setShowLogin(true);
      return;
    }
    
    // 認証済みの場合は既存のデータ読み込み処理
    // サプリ情報を読み込み
    const savedLutevita = localStorage.getItem('nonda-lutevita') === 'true';
    const savedCustom = localStorage.getItem('nonda-custom-supplement-enabled') === 'true';
    const savedCustomName = localStorage.getItem('nonda-custom-supplement-name');
    
    setIsLutevitaSelected(savedLutevita);
    setIsCustomSelected(savedCustom);
    if (savedCustomName) {
      setCustomSupplementName(savedCustomName);
    }
    
    // 服薬開始日を読み込み
    const savedStartDate = localStorage.getItem('nonda-start-date');
    if (savedStartDate) {
      setStartDate(new Date(savedStartDate));
    }
    
    // リマインダー設定を読み込み
    const savedReminderTime = localStorage.getItem('nonda-reminder-time');
    const savedReminderEnabled = localStorage.getItem('nonda-reminder-enabled');
    if (savedReminderTime) {
      setReminderTime(savedReminderTime);
    }
    if (savedReminderEnabled === 'true') {
      setReminderEnabled(true);
      if (savedReminderTime) {
        setupDailyReminder(savedReminderTime);
      }
    }
    
    // 服薬記録を読み込み
    const savedTakenDays = localStorage.getItem('nonda-taken-days');
    if (savedTakenDays) {
      const parsed = JSON.parse(savedTakenDays);
      const mapData = new Map();
      for (const [key, value] of Object.entries(parsed)) {
        mapData.set(key, new Set(value));
      }
      setTakenDays(mapData);
    }
    
    // メモを読み込み
    const savedMemos = localStorage.getItem('nonda-memos');
    if (savedMemos) {
      const parsed = JSON.parse(savedMemos);
      const mapData = new Map();
      for (const [key, value] of Object.entries(parsed)) {
        const memoMap = new Map(Object.entries(value));
        mapData.set(key, memoMap);
      }
      setMemos(mapData);
    }
    
    // チュートリアル状況をチェック
    const tutorialCompleted = localStorage.getItem('nonda-tutorial-completed');
    if (!tutorialCompleted && userName) {
      setShowTutorial(true);
      setTutorialStep(0);
    }
  }, []);

  // カレンダー計算
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();

  // 表示用のサプリ名を取得
  const getDisplaySupplementName = () => {
    const supplements = [];
    if (isLutevitaSelected) {
      supplements.push('ルテビタ');
    }
    if (isCustomSelected && customSupplementName) {
      supplements.push(customSupplementName);
    }
    
    if (supplements.length > 0) {
      return supplements.join('・') + '';
    }
    return 'サプリメント';
  };

  // 月の一意キーを生成
  const getMonthKey = (year, month) => `${year}-${month}`;
  const currentMonthKey = getMonthKey(currentYear, currentMonth);

  // 現在の月のデータを取得
  const getCurrentMonthTakenDays = () => takenDays.get(currentMonthKey) || new Set();
  const getCurrentMonthMemos = () => memos.get(currentMonthKey) || new Map();

  // 統計計算
  const getTotalTakenDays = () => {
    let total = 0;
    for (const monthTakenDays of takenDays.values()) {
      total += monthTakenDays.size;
    }
    return total;
  };

  const getDaysSinceStart = () => {
    if (!startDate) return 0;
    const today = new Date();
    const diffTime = today - startDate;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const getTotalContinuationRate = () => {
    if (!startDate) return 0;
    const daysSinceStart = getDaysSinceStart();
    const totalTakenDays = getTotalTakenDays();
    return Math.round((totalTakenDays / daysSinceStart) * 100);
  };

  // 月ナビゲーション
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  // モーダル操作
  const handleDayClick = (day) => {
    setSelectedDay(day);
    const currentMemos = getCurrentMonthMemos();
    setCurrentMemo(currentMemos.get(day) || '');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDay(null);
    setCurrentMemo('');
  };

  // データ保存
  const saveData = () => {
    const currentTakenDays = getCurrentMonthTakenDays();
    const currentMemos = getCurrentMonthMemos();
    
    // 服薬記録の更新
    const newTakenDays = new Set(currentTakenDays);
    const isTaken = document.getElementById('taken-checkbox').checked;
    
    if (isTaken) {
      newTakenDays.add(selectedDay);
    } else {
      newTakenDays.delete(selectedDay);
    }
    
    const newTakenDaysMap = new Map(takenDays);
    newTakenDaysMap.set(currentMonthKey, newTakenDays);
    setTakenDays(newTakenDaysMap);
    
    // メモの更新
    const newMemos = new Map(currentMemos);
    if (currentMemo.trim()) {
      newMemos.set(selectedDay, currentMemo.trim());
    } else {
      newMemos.delete(selectedDay);
    }
    
    const newMemosMap = new Map(memos);
    newMemosMap.set(currentMonthKey, newMemos);
    setMemos(newMemosMap);
    
    // ローカルストレージに保存
    saveToLocalStorage(newTakenDaysMap, newMemosMap);
    
    closeModal();
  };

  const saveToLocalStorage = (takenDaysMap, memosMap) => {
    // 服薬記録を保存
    const takenDaysObj = {};
    for (const [key, value] of takenDaysMap.entries()) {
      takenDaysObj[key] = Array.from(value);
    }
    localStorage.setItem('nonda-taken-days', JSON.stringify(takenDaysObj));
    
    // メモを保存
    const memosObj = {};
    for (const [key, value] of memosMap.entries()) {
      memosObj[key] = Object.fromEntries(value);
    }
    localStorage.setItem('nonda-memos', JSON.stringify(memosObj));
  };

  // 設定保存
  const saveSettings = () => {
    const dateInput = document.getElementById('start-date-input').value;
    if (dateInput) {
      const newStartDate = new Date(dateInput);
      setStartDate(newStartDate);
      localStorage.setItem('nonda-start-date', newStartDate.toISOString());
    }
    
    const nameInput = document.getElementById('username-input').value;
    const emailInput = document.getElementById('email-input').value;
    
    if (nameInput.trim()) {
      setUserName(nameInput.trim());
      localStorage.setItem('nonda-username', nameInput.trim());
    }
    
    if (emailInput.trim()) {
      // 簡単なメール形式チェック
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailInput.trim())) {
        alert('正しいメールアドレスを入力してください。');
        return;
      }
      setUserEmail(emailInput.trim());
      localStorage.setItem('nonda-user-email', emailInput.trim());
    }
    
    // サプリ情報を保存
    const lutevitaCheckbox = document.getElementById('lutevita-checkbox').checked;
    const customCheckbox = document.getElementById('custom-checkbox').checked;
    const customInput = document.getElementById('custom-supplement-input').value;
    
    setIsLutevitaSelected(lutevitaCheckbox);
    setIsCustomSelected(customCheckbox);
    setCustomSupplementName(customInput);
    
    localStorage.setItem('nonda-lutevita', lutevitaCheckbox.toString());
    localStorage.setItem('nonda-custom-supplement-enabled', customCheckbox.toString());
    localStorage.setItem('nonda-custom-supplement-name', customInput);
    
    const timeInput = document.getElementById('reminder-time-input').value;
    const enabledInput = document.getElementById('reminder-enabled-checkbox').checked;
    
    setReminderTime(timeInput);
    setReminderEnabled(enabledInput);
    
    localStorage.setItem('nonda-reminder-time', timeInput);
    localStorage.setItem('nonda-reminder-enabled', enabledInput.toString());
    
    if (enabledInput && timeInput) {
      setupDailyReminder(timeInput);
    } else {
      clearDailyReminder();
    }
    
    setShowSettings(false);
  };

  // ウェルカム保存
  const saveWelcomeData = () => {
    const nameInput = document.getElementById('welcome-name-input').value;
    const emailInput = document.getElementById('welcome-email-input').value;
    const consentCheckbox = document.getElementById('privacy-consent-checkbox').checked;
    
    if (!nameInput.trim()) {
      alert('お名前を入力してください。');
      return;
    }
    
    if (!emailInput.trim()) {
      alert('メールアドレスを入力してください。');
      return;
    }
    
    // 簡単なメール形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput.trim())) {
      alert('正しいメールアドレスを入力してください。');
      return;
    }
    
    if (!consentCheckbox) {
      alert('プライバシーポリシーへの同意が必要です。');
      return;
    }
    
    setUserName(nameInput.trim());
    setUserEmail(emailInput.trim());
    localStorage.setItem('nonda-username', nameInput.trim());
    localStorage.setItem('nonda-user-email', emailInput.trim());
    localStorage.setItem('nonda-privacy-consent', 'true');
    localStorage.setItem('nonda-consent-date', new Date().toISOString());
    
    // メールアドレスをサーバーに送信（将来的に）
    console.log('ユーザー登録:', { 
      name: nameInput.trim(), 
      email: emailInput.trim(),
      consentDate: new Date().toISOString()
    });
    
    setShowWelcome(false);
    
    const tutorialCompleted = localStorage.getItem('nonda-tutorial-completed');
    if (!tutorialCompleted) {
      setShowTutorial(true);
      setTutorialStep(0);
    }
  };

  // リマインダー機能
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  };

  const setupDailyReminder = async (time) => {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      alert('通知を有効にするには、ブラウザの設定で通知を許可してください。');
      return;
    }
    
    clearDailyReminder();
    
    const intervalId = setInterval(() => {
      const now = new Date();
      const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                         now.getMinutes().toString().padStart(2, '0');
      
      if (currentTime === time) {
        showNotification();
      }
    }, 60000);
    
    window.reminderInterval = intervalId;
  };

  const clearDailyReminder = () => {
    if (window.reminderInterval) {
      clearInterval(window.reminderInterval);
      window.reminderInterval = null;
    }
  };

  const showNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('nonda - 服薬リマインダー', {
        body: 'サプリメントを飲む時間です！',
        icon: '/favicon.ico',
        badge: '/favicon.ico'
      });
    }
  };

  // SNSシェア機能
  const shareToTwitter = () => {
    const daysSinceStart = getDaysSinceStart();
    const totalTakenDays = getTotalTakenDays();
    const continuationRate = getTotalContinuationRate();
    
    const text = `nondaで${daysSinceStart}日間サプリメント管理中！\n総服薬日数: ${totalTakenDays}日\n継続率: ${continuationRate}%\n\n健康的な習慣を継続しています✨\n\n#nonda #サプリメント #健康管理 #継続は力なり`;
    
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const shareToFacebook = () => {
    const daysSinceStart = getDaysSinceStart();
    const totalTakenDays = getTotalTakenDays();
    const continuationRate = getTotalContinuationRate();
    
    const text = `nondaでサプリメント管理を${daysSinceStart}日間継続中！総服薬日数${totalTakenDays}日、継続率${continuationRate}%を達成しました。健康的な習慣づくりを頑張っています！`;
    
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const generateShareImage = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 1080;
    canvas.height = 1080;
    
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('nonda', canvas.width / 2, 200);
    
    ctx.font = '48px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('サプリメント服薬記録', canvas.width / 2, 280);
    
    const daysSinceStart = getDaysSinceStart();
    const totalTakenDays = getTotalTakenDays();
    const continuationRate = getTotalContinuationRate();
    
    ctx.font = 'bold 64px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`${daysSinceStart}日間継続中`, canvas.width / 2, 450);
    
    ctx.font = '52px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`総服薬日数: ${totalTakenDays}日`, canvas.width / 2, 550);
    ctx.fillText(`継続率: ${continuationRate}%`, canvas.width / 2, 630);
    
    ctx.font = '42px -apple-system, BlinkMacSystemFont, sans-serif';
    const message = getMotivationalMessage();
    const words = message.split('');
    let line = '';
    let y = 750;
    
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i];
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      
      if (testWidth > 900 && i > 0) {
        ctx.fillText(line, canvas.width / 2, y);
        line = words[i];
        y += 50;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, canvas.width / 2, y);
    
    ctx.font = '36px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('#nonda #健康管理 #継続は力なり', canvas.width / 2, 950);
    
    const link = document.createElement('a');
    link.download = `nonda-share-${new Date().getTime()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  // チュートリアル機能
  const nextTutorialStep = () => {
    if (tutorialStep < tutorialSteps.length - 1) {
      setTutorialStep(tutorialStep + 1);
    } else {
      setShowTutorial(false);
      localStorage.setItem('nonda-tutorial-completed', 'true');
    }
  };

  const skipTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('nonda-tutorial-completed', 'true');
  };

  const tutorialSteps = [
    {
      title: "ようこそ、nondaへ！",
      content: "nondaはサプリメントの服薬管理アプリです。継続を楽しくサポートします。",
      buttonText: "次へ"
    },
    {
      title: "📅 日付をタップして記録",
      content: "カレンダーの日付をタップすると、服薬記録とメモを入力できます。",
      buttonText: "次へ"
    },
    {
      title: "⚙️ 設定で開始日を登録",
      content: "右上の設定ボタンから服薬開始日を設定すると、継続日数や励ましメッセージが表示されます。",
      buttonText: "次へ"
    },
    {
      title: "🎉 成果をシェアしよう",
      content: "継続の成果をSNSでシェアして、モチベーションを維持しましょう！",
      buttonText: "始める"
    }
  ];

  // 励ましメッセージを取得
  const getMotivationalMessage = () => {
    const daysSinceStart = getDaysSinceStart();
    
    if (daysSinceStart >= 90) {
      return "研究では3ヶ月継続で多くの効果が報告されています。素晴らしい継続力です！";
    } else if (daysSinceStart >= 60) {
      return "2ヶ月継続おめでとうございます！体の変化を実感し始める時期です。";
    } else if (daysSinceStart >= 30) {
      return "1ヶ月継続達成！研究では30日で初期効果が現れると言われています。";
    } else if (daysSinceStart >= 14) {
      return "2週間継続中！習慣化まであと少しです。";
    } else if (daysSinceStart >= 7) {
      return "1週間継続おめでとうございます！良いスタートです。";
    } else if (daysSinceStart >= 3) {
      return "3日継続中！習慣化への第一歩です。";
    } else {
      return "服薬を開始しました。継続が効果の鍵です。";
    }
  };

  // カレンダー描画
  const renderCalendar = () => {
    const days = [];
    const currentTakenDays = getCurrentMonthTakenDays();
    const currentMemos = getCurrentMonthMemos();
    
    // 空白のセル
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }
    
    // 日付のセル
    for (let day = 1; day <= daysInMonth; day++) {
      const isTaken = currentTakenDays.has(day);
      const hasMemo = currentMemos.has(day);
      const isToday = day === today.getDate() && 
                     currentMonth === today.getMonth() && 
                     currentYear === today.getFullYear();
      
      days.push(
        <div
          key={day}
          className={`calendar-day ${isTaken ? 'taken' : ''} ${isToday ? 'today' : ''} ${hasMemo ? 'has-memo' : ''}`}
          onClick={() => handleDayClick(day)}
        >
          {day}
          {isTaken && <div className="check-mark">✓</div>}
          {hasMemo && <div className="memo-indicator">📝</div>}
        </div>
      );
    }
    
    return days;
  };

  // 月名
  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ];

  // 認証が完了していない場合はログイン画面を表示
  if (!isAuthenticated) {
    return (
      <div className="App">
        {/* ログイン画面 */}
        {showLogin && (
          <div className="modal-overlay">
            <div className="modal-content login-modal">
              <h3>nondaにログイン</h3>
              <p>メールアドレスに6桁のPINコードを送信します</p>
              
              <div className="modal-section">
                <label htmlFor="login-email-input">メールアドレス</label>
                <input
                  id="login-email-input"
                  type="email"
                  placeholder="example@email.com"
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleLogin();
                    }
                  }}
                />
              </div>
              
              {authError && (
                <div className="error-message">
                  {authError}
                </div>
              )}
              
              <div className="modal-buttons">
                <button 
                  className="btn-primary" 
                  onClick={handleLogin}
                  disabled={loginLoading}
                >
                  {loginLoading ? 'PIN送信中...' : 'PINコードを送信'}
                </button>
              </div>
              
              <div className="login-info">
                <p>初回ログインの場合、アカウントが自動作成されます</p>
              </div>
            </div>
          </div>
        )}

        {/* PIN入力画面 */}
        {showPinInput && (
          <div className="modal-overlay">
            <div className="modal-content pin-modal">
              <h3>PIN認証</h3>
              <p>{authEmail} に6桁のPINコードを送信しました</p>
              
              <div className="modal-section">
                <label htmlFor="pin-input">6桁のPINコード</label>
                <input
                  id="pin-input"
                  type="text"
                  maxLength="6"
                  placeholder="123456"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && pinCode.length === 6) {
                      handlePinSubmit();
                    }
                  }}
                  style={{
                    fontSize: '24px',
                    textAlign: 'center',
                    letterSpacing: '8px',
                    fontFamily: 'monospace'
                  }}
                />
              </div>
              
              {authError && (
                <div className="error-message">
                  {authError}
                </div>
              )}
              
              <div className="modal-buttons">
                <button 
                  className="btn-secondary" 
                  onClick={() => {
                    setShowPinInput(false);
                    setShowLogin(true);
                    setPinCode('');
                    setAuthError('');
                  }}
                >
                  メールアドレスを変更
                </button>
                <button 
                  className="btn-primary" 
                  onClick={handlePinSubmit}
                  disabled={loginLoading || pinCode.length !== 6}
                >
                  {loginLoading ? '認証中...' : 'ログイン'}
                </button>
              </div>
              
              <div className="login-info">
                <p>PINコードが届かない場合は、迷惑メールフォルダもご確認ください</p>
                <button 
                  className="resend-pin-btn"
                  onClick={() => sendPinCode(authEmail)}
                  disabled={loginLoading}
                >
                  PINコードを再送信
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="App">
      <header className="app-header">
        <h1>nonda</h1>
        <p>{getDisplaySupplementName()}服薬記録</p>
        {userName && <p className="welcome-text">こんにちは、{userName}さん！</p>}
        <button className="settings-btn" onClick={() => setShowSettings(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          設定
        </button>
      </header>
      
      <main className="main-content">
        <div className="calendar-container">
          <div className="calendar-header">
            <button className="nav-button" onClick={goToPreviousMonth}>
              ‹
            </button>
            <h2 onClick={goToToday} className="month-title">
              {currentYear}年 {monthNames[currentMonth]}
            </h2>
            <button className="nav-button" onClick={goToNextMonth}>
              ›
            </button>
          </div>
          
          <div className="calendar-weekdays">
            <div>日</div>
            <div>月</div>
            <div>火</div>
            <div>水</div>
            <div>木</div>
            <div>金</div>
            <div>土</div>
          </div>
          
          <div className="calendar-grid">
            {renderCalendar()}
          </div>
          
          <div className="stats">
            {startDate && (
              <div className="total-stats">
                <p className="total-days">総服薬日数: {getTotalTakenDays()}日 / {getDaysSinceStart()}日</p>
                <p className="total-rate">トータル継続率: {getTotalContinuationRate()}%</p>
              </div>
            )}
            
            <div className="monthly-stats">
              <p>今月の服薬日数: {getCurrentMonthTakenDays().size}日 / {daysInMonth}日</p>
            </div>
          </div>
          
          {startDate && (
            <div className="motivation-message">
              <p>💪 {getMotivationalMessage()}</p>
            </div>
          )}
          
          {startDate && (
            <div className="share-section">
              <h3>成果をシェアしよう！</h3>
              <div className="share-buttons">
                <button className="share-btn twitter" onClick={shareToTwitter} title="Xでシェア">
                  <span className="share-icon">𝕏</span>
                </button>
                <button className="share-btn facebook" onClick={shareToFacebook} title="Facebookでシェア">
                  <i className="fab fa-facebook-f"></i>
                </button>
                <button className="share-btn instagram" onClick={generateShareImage} title="Instagram用画像をダウンロード">
                  <i className="fab fa-instagram"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* フッター */}
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>nonda</h4>
            <p>服薬管理アプリ</p>
            <p>毎日の習慣を健康に</p>
          </div>
          
          <div className="footer-section">
            <h4>運営会社</h4>
            <p>株式会社YURU</p>
            <p>
              <a href="https://yuru-store.com/" target="_blank" rel="noopener noreferrer">
                YURU store
              </a>
            </p>
            <p>
              <a href="https://yuru-store.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer">
                プライバシーポリシー
              </a>
            </p>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; 2024 YURU Inc. All rights reserved.</p>
          <p>暮らしに、"ちょっといい"を。</p>
        </div>
      </footer>

      {/* 日記録モーダル */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{currentYear}年{monthNames[currentMonth]}{selectedDay}日</h3>
            
            <div className="modal-section">
              <label className="checkbox-label">
                <input
                  id="taken-checkbox"
                  type="checkbox"
                  defaultChecked={getCurrentMonthTakenDays().has(selectedDay)}
                />
                服薬チェック
              </label>
            </div>
            
            <div className="modal-section">
              <label htmlFor="memo-input">メモ</label>
              <textarea
                id="memo-input"
                value={currentMemo}
                onChange={(e) => setCurrentMemo(e.target.value)}
                placeholder="体調、サプリメント注文、肌の調子など..."
                rows="4"
              />
            </div>
            
            <div className="modal-buttons">
              <button className="btn-secondary" onClick={closeModal}>
                キャンセル
              </button>
              <button className="btn-primary" onClick={saveData}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 設定モーダル */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>設定</h3>
            
            <div className="modal-section">
              <label htmlFor="start-date-input">服薬開始日</label>
              <input
                id="start-date-input"
                type="date"
                defaultValue={startDate ? startDate.toISOString().split('T')[0] : ''}
              />
              <small>開始日を設定すると、継続日数や励ましメッセージが表示されます。</small>
            </div>
            
            <div className="modal-section">
              <label htmlFor="username-input">お名前</label>
              <input
                id="username-input"
                type="text"
                defaultValue={userName}
                placeholder="お名前を入力してください"
              />
              <small>アプリでの表示名を設定できます。</small>
            </div>
            
            <div className="modal-section">
              <label htmlFor="email-input">メールアドレス</label>
              <input
                id="email-input"
                type="email"
                defaultValue={userEmail}
                placeholder="example@email.com"
              />
              <small>継続サポートや新機能のお知らせをお送りします。</small>
            </div>
            
            <div className="modal-section">
              <label>飲んでいるサプリメント（複数選択可）</label>
              <div className="supplement-options">
                <label className="supplement-option recommended">
                  <div className="option-header">
                    <input
                      id="lutevita-checkbox"
                      type="checkbox"
                      defaultChecked={isLutevitaSelected}
                    />
                    <span className="supplement-name">ルテビタ</span>
                    <span className="supplement-badge">おすすめ</span>
                  </div>
                  <small>目の健康をサポートするルテインサプリ</small>
                  <div className="store-link">
                    <a href="https://yuru-store.com/" target="_blank" rel="noopener noreferrer">
                      ルテビタの詳細・ご購入はこちら →
                    </a>
                  </div>
                </label>
                
                <label className="supplement-option">
                  <div className="option-header">
                    <input
                      id="custom-checkbox"
                      type="checkbox"
                      defaultChecked={isCustomSelected}
                    />
                    <span className="supplement-name">その他のサプリメント</span>
                  </div>
                </label>
                
                <input
                  id="custom-supplement-input"
                  type="text"
                  defaultValue={customSupplementName}
                  placeholder="サプリメント名を入力してください"
                  className="custom-supplement-input"
                />
              </div>
            </div>
            
            <div className="modal-section">
              <label className="checkbox-label">
                <input
                  id="reminder-enabled-checkbox"
                  type="checkbox"
                  defaultChecked={reminderEnabled}
                  onChange={(e) => {
                    const timeInput = document.getElementById('reminder-time-input');
                    timeInput.disabled = !e.target.checked;
                  }}
                />
                リマインダーを有効にする
              </label>
            </div>
            
            <div className="modal-section">
              <label htmlFor="reminder-time-input">リマインダー時刻</label>
              <input
                id="reminder-time-input"
                type="time"
                defaultValue={reminderTime}
                disabled={!reminderEnabled}
              />
              <small>設定した時間に服薬の通知が届きます。</small>
            </div>
            
            <div className="modal-buttons">
              <button className="btn-secondary" onClick={() => setShowSettings(false)}>
                キャンセル
              </button>
              <button className="btn-primary" onClick={saveSettings}>
                保存
              </button>
            </div>
            
            <div className="logout-section">
              <button className="logout-btn" onClick={handleLogout}>
                ログアウト
              </button>
              <small>ログアウトすると次回ログイン時にPIN認証が必要になります</small>
            </div>
          </div>
        </div>
      )}

      {/* 初回ウェルカムモーダル */}
      {showWelcome && (
        <div className="modal-overlay">
          <div className="modal-content welcome-modal">
            <h3>nondaへようこそ！</h3>
            <p>サプリメントの服薬管理を始めましょう</p>
            
            <div className="modal-section">
              <label htmlFor="welcome-name-input">お名前を教えてください</label>
              <input
                id="welcome-name-input"
                type="text"
                placeholder="お名前を入力してください"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const emailInput = document.getElementById('welcome-email-input');
                    if (emailInput) emailInput.focus();
                  }
                }}
              />
            </div>
            
            <div className="modal-section">
              <label htmlFor="welcome-email-input">メールアドレス</label>
              <input
                id="welcome-email-input"
                type="email"
                placeholder="example@email.com"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    saveWelcomeData();
                  }
                }}
              />
              <div className="email-usage-notice">
                <p>ご入力いただいたメールアドレスは服薬継続サポートおよび、YURUストアからのご案内に使用いたします。</p>
                <p>配信停止はいつでも可能です。</p>
              </div>
            </div>
            
            <div className="modal-section">
              <label className="privacy-consent-label">
                <input
                  id="privacy-consent-checkbox"
                  type="checkbox"
                  required
                />
                <span className="checkmark"></span>
                <span className="consent-text">
                  <a href="https://yuru-store.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer">
                    プライバシーポリシー
                  </a>
                  に同意します
                </span>
              </label>
            </div>
            
            <div className="modal-buttons">
              <button className="btn-primary" onClick={saveWelcomeData}>
                始める
              </button>
            </div>
          </div>
        </div>
      )}

      {/* チュートリアルモーダル */}
      {showTutorial && (
        <div className="modal-overlay">
          <div className="modal-content tutorial-modal">
            <div className="tutorial-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{width: `${((tutorialStep + 1) / tutorialSteps.length) * 100}%`}}
                ></div>
              </div>
              <span className="progress-text">
                {tutorialStep + 1} / {tutorialSteps.length}
              </span>
            </div>
            
            <h3>{tutorialSteps[tutorialStep].title}</h3>
            <p>{tutorialSteps[tutorialStep].content}</p>
            
            <div className="tutorial-buttons">
              <button className="btn-secondary" onClick={skipTutorial}>
                スキップ
              </button>
              <button className="btn-primary" onClick={nextTutorialStep}>
                {tutorialSteps[tutorialStep].buttonText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;