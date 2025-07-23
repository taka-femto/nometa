import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  // Google Apps Script エンドポイント
  const API_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwdwMQQNkvoZC2e0EUz2Hw7IlAN7YGo-trcLxVNT-XYeJ6dDXANafkQsACIRPziGj3ynA/exec';
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
  
  // アプリの状態管理
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [takenDays, setTakenDays] = useState(new Map());
  const [startDate, setStartDate] = useState(null);
  const [emailReminderTime, setEmailReminderTime] = useState('');
  const [emailReminderEnabled, setEmailReminderEnabled] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isLutevitaSelected, setIsLutevitaSelected] = useState(false);
  const [isCustomSelected, setIsCustomSelected] = useState(false);
  const [customSupplementName, setCustomSupplementName] = useState('');
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // 時間帯別チェック用の状態
  const [currentTimeChecks, setCurrentTimeChecks] = useState({
    morning: false,
    noon: false,
    evening: false,
    bedtime: false,
    other: false
  });

  // 認証状態をチェック
  const checkAuthStatus = () => {
    const authToken = localStorage.getItem('nometa-auth-token');
    const loginDate = localStorage.getItem('nometa-login-date');
    const autoLogin = localStorage.getItem('nometa-auto-login');
    
    if (authToken && loginDate && autoLogin === 'true') {
      const loginDateTime = new Date(loginDate);
      const now = new Date();
      const daysDiff = Math.floor((now - loginDateTime) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 30) {
        setIsAuthenticated(true);
        const savedEmail = localStorage.getItem('nometa-user-email');
        const savedName = localStorage.getItem('nometa-username');
        if (savedEmail) setUserEmail(savedEmail);
        if (savedName) setUserName(savedName);
        return true;
      } else {
        clearAuthData();
      }
    }
    
    return false;
  };

  // 認証データをクリア
  const clearAuthData = () => {
    localStorage.removeItem('nometa-auth-token');
    localStorage.removeItem('nometa-login-date');
    localStorage.removeItem('nometa-auto-login');
    setIsAuthenticated(false);
    setAuthEmail('');
    setPinCode('');
  };

  // PIN送信
  const sendPinCode = async (email) => {
    setLoginLoading(true);
    setAuthError('');
    
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ action: 'sendPin', email: email })
      });
      const data = await response.json();
      
      if (data.success) {
        setAuthEmail(email);
        setShowLogin(false);
        setShowPinInput(true);
        alert('PINコードを送信しました。メールボックス（迷惑メールフォルダも含む）をご確認ください。');
      } else {
        setAuthError(data.message || 'PIN送信に失敗しました');
      }
    } catch (error) {
      setAuthError('ネットワークエラーが発生しました。');
    } finally {
      setLoginLoading(false);
    }
  };

  // PIN認証
  const verifyPinCode = async () => {
    setLoginLoading(true);
    setAuthError('');
    
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ action: 'verifyPin', email: authEmail, pin: pinCode })
      });
      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('nometa-auth-token', 'auth-' + Date.now());
        localStorage.setItem('nometa-login-date', new Date().toISOString());
        localStorage.setItem('nometa-auto-login', 'true');
        
        setIsAuthenticated(true);
        setShowPinInput(false);
        setPinCode('');
        
        // サーバーからのデータで状態を完全に同期
        syncUserDataFromServer(data.userData);

        // 新規ユーザーの場合チュートリアル表示
        if (!data.userData.name && !data.userData.startDate) {
          setUserEmail(authEmail);
          localStorage.setItem('nometa-user-email', authEmail);
          setShowTutorial(true);
          setTutorialStep(0);
        }
      } else {
        setAuthError(data.message || 'PIN認証に失敗しました');
      }
    } catch (error) {
      setAuthError('ネットワークエラーが発生しました。');
    } finally {
      setLoginLoading(false);
    }
  };

  // 服薬記録をサーバーに送信
  const updateTakenDaysOnServer = async (email, takenDaysMap) => {
    const takenDaysObj = {};
    for (const [key, value] of takenDaysMap.entries()) {
      takenDaysObj[key] = Object.fromEntries(value);
    }
    const takenDaysJSON = JSON.stringify(takenDaysObj);

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'updateTakenDaysData',
          email: email,
          takenDaysData: takenDaysJSON
        })
      });
      const data = await response.json();
      console.log('服薬記録更新レスポンス:', data);
      return data.success;
    } catch (error) {
      console.error('服薬記録更新エラー:', error);
      return false;
    }
  };

  // 他の設定をサーバーに送信する関数群...
  const updateSupplementSettings = async (email, isLutevitaSelected, isCustomSelected, customSupplementName) => {
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', },
        body: new URLSearchParams({
          action: 'updateSupplementSettings',
          email: email,
          isLutevitaSelected: isLutevitaSelected.toString(),
          isCustomSelected: isCustomSelected.toString(),
          customSupplementName: customSupplementName || ''
        })
      });
      const data = await response.json();
      console.log('サプリ設定更新レスポンス:', data);
      return data.success;
    } catch (error) {
      console.error('サプリ設定更新エラー:', error);
      return false;
    }
  };

  const updateEmailReminderSettings = async (email, time, enabled) => {
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', },
        body: new URLSearchParams({
          action: 'updateEmailReminder',
          email: email,
          reminderTime: time,
          reminderEnabled: enabled.toString()
        })
      });
      const data = await response.json();
      console.log('メール通知設定更新レスポンス:', data);
      return data.success;
    } catch (error) {
      console.error('メール通知設定更新エラー:', error);
      return false;
    }
  };

  const updateUserNameOnServer = async (email, name) => {
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', },
        body: new URLSearchParams({
          action: 'updateUserName',
          email: email,
          name: name
        })
      });
      const data = await response.json();
      console.log('ユーザー名更新レスポンス:', data);
      return data.success;
    } catch (error) {
      console.error('ユーザー名更新エラー:', error);
      return false;
    }
  };

  // サーバーからのデータで状態を完全に同期
  const syncUserDataFromServer = (userData) => {
    if (!userData) return;

    // 基本情報
    setUserName(userData.name || '');
    localStorage.setItem('nometa-username', userData.name || '');
    setUserEmail(userData.email);
    localStorage.setItem('nometa-user-email', userData.email);
    
    // 開始日
    if (userData.startDate) {
      setStartDate(new Date(userData.startDate));
      localStorage.setItem('nometa-start-date', userData.startDate);
    } else {
      setStartDate(null);
      localStorage.removeItem('nometa-start-date');
    }

    // 服薬記録
    if (userData.takenDaysData) {
      try {
        const parsedTakenDays = JSON.parse(userData.takenDaysData);
        const mapData = new Map();
        for (const [key, value] of Object.entries(parsedTakenDays)) {
          const dayMap = new Map(Object.entries(value));
          mapData.set(key, dayMap);
        }
        setTakenDays(mapData);
        localStorage.setItem('nometa-taken-days', userData.takenDaysData);
      } catch (e) {
        console.error("サーバーからの服薬記録の解析に失敗:", e);
        setTakenDays(new Map());
        localStorage.removeItem('nometa-taken-days');
      }
    } else {
      setTakenDays(new Map());
      localStorage.removeItem('nometa-taken-days');
    }
  };

  // 初回起動時にlocalStorageからデータを読み込み（オフライン対応）
  useEffect(() => {
    const isLoggedIn = checkAuthStatus();
    if (!isLoggedIn) {
      setShowLogin(true);
    } else {
      loadUserDataFromLocalStorage();
    }
  }, []);

  const loadUserDataFromLocalStorage = () => {
    const savedTakenDays = localStorage.getItem('nometa-taken-days');
    if (savedTakenDays) {
      try {
        const parsed = JSON.parse(savedTakenDays);
        const mapData = new Map();
        for (const [key, value] of Object.entries(parsed)) {
          const dayMap = new Map();
          for (const [day, checks] of Object.entries(value)) {
            dayMap.set(parseInt(day), checks);
          }
          mapData.set(key, dayMap);
        }
        setTakenDays(mapData);
      } catch (e) {
        console.error("ローカルの服薬記録の解析に失敗:", e);
      }
    }
    // 他のlocalStorageデータも読み込む
    const savedLutevita = localStorage.getItem('nometa-lutevita') === 'true';
    setIsLutevitaSelected(savedLutevita);
    const savedCustom = localStorage.getItem('nometa-custom-supplement-enabled') === 'true';
    setIsCustomSelected(savedCustom);
    const savedCustomName = localStorage.getItem('nometa-custom-supplement-name');
    setCustomSupplementName(savedCustomName || '');
    const savedStartDate = localStorage.getItem('nometa-start-date');
    if (savedStartDate) setStartDate(new Date(savedStartDate));
    const savedEmailReminderTime = localStorage.getItem('nometa-email-reminder-time');
    setEmailReminderTime(savedEmailReminderTime || '');
    const savedEmailReminderEnabled = localStorage.getItem('nometa-email-reminder-enabled') === 'true';
    setEmailReminderEnabled(savedEmailReminderEnabled);
  };


  // カレンダー計算
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();

  // 表示用のサプリ名を取得
  const getDisplaySupplementName = () => {
    const supplements = [];
    if (isLutevitaSelected) supplements.push('ルテビタ');
    if (isCustomSelected && customSupplementName) supplements.push(customSupplementName);
    if (supplements.length > 0) return supplements.join('・') + '';
    return 'サプリメント';
  };

  // 月の一意キーを生成
  const getMonthKey = (year, month) => `${year}-${month}`;
  const currentMonthKey = getMonthKey(currentYear, currentMonth);

  // 現在の月のデータを取得
  const getCurrentMonthTakenDays = () => takenDays.get(currentMonthKey) || new Map();

  // 日付の服薬チェック状態を取得
  const getDayTakenStatus = (day) => {
    const currentTakenDays = getCurrentMonthTakenDays();
    const dayData = currentTakenDays.get(day);
    if (!dayData) return false;
    return dayData.morning || dayData.noon || dayData.evening || dayData.bedtime || dayData.other;
  };

  // 統計計算
  const getTotalTakenDays = () => {
    let total = 0;
    for (const monthTakenDays of takenDays.values()) {
      for (const dayData of monthTakenDays.values()) {
        if (dayData.morning || dayData.noon || dayData.evening || dayData.bedtime || dayData.other) {
          total++;
        }
      }
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
    setCurrentMonth(prev => prev === 0 ? 11 : prev - 1);
    if (currentMonth === 0) setCurrentYear(prev => prev - 1);
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => prev === 11 ? 0 : prev + 1);
    if (currentMonth === 11) setCurrentYear(prev => prev + 1);
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  // モーダル操作
  const handleDayClick = (day) => {
    setSelectedDay(day);
    const currentTakenDays = getCurrentMonthTakenDays();
    const dayData = currentTakenDays.get(day);
    setCurrentTimeChecks(dayData || { morning: false, noon: false, evening: false, bedtime: false, other: false });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDay(null);
    setCurrentTimeChecks({ morning: false, noon: false, evening: false, bedtime: false, other: false });
  };

  // データ保存時にサーバーへも送信
  const saveData = () => {
    const morningCheck = document.getElementById('morning-check').checked;
    const noonCheck = document.getElementById('noon-check').checked;
    const eveningCheck = document.getElementById('evening-check').checked;
    const bedtimeCheck = document.getElementById('bedtime-check').checked;
    const otherCheck = document.getElementById('other-check').checked;
    
    const newTakenDays = new Map(getCurrentMonthTakenDays());
    newTakenDays.set(selectedDay, {
      morning: morningCheck,
      noon: noonCheck,
      evening: eveningCheck,
      bedtime: bedtimeCheck,
      other: otherCheck
    });
    
    const newTakenDaysMap = new Map(takenDays);
    newTakenDaysMap.set(currentMonthKey, newTakenDays);
    setTakenDays(newTakenDaysMap);
    
    // サーバーとlocalStorageに保存
    saveDataToSources(newTakenDaysMap);
    closeModal();
  };

  const saveDataToSources = (takenDaysMap) => {
    // サーバーに保存
    if (userEmail) {
      updateTakenDaysOnServer(userEmail, takenDaysMap);
    }
    // ローカルにも保存（オフライン対応）
    const takenDaysObj = {};
    for (const [key, value] of takenDaysMap.entries()) {
      takenDaysObj[key] = Object.fromEntries(value);
    }
    localStorage.setItem('nometa-taken-days', JSON.stringify(takenDaysObj));
  };


  // 設定保存
  const saveSettings = () => {
    const dateInput = document.getElementById('start-date-input').value;
    if (dateInput) {
      const newStartDate = new Date(dateInput);
      setStartDate(newStartDate);
      localStorage.setItem('nometa-start-date', newStartDate.toISOString());
    }
    
    const nameInput = document.getElementById('username-input').value;
    const emailInput = document.getElementById('email-input').value;
    
    if (nameInput.trim()) {
      const newName = nameInput.trim();
      setUserName(newName);
      localStorage.setItem('nometa-username', newName);
      if (userEmail) updateUserNameOnServer(userEmail, newName);
    }
    
    if (emailInput.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailInput.trim())) {
        alert('正しいメールアドレスを入力してください。');
        return;
      }
      setUserEmail(emailInput.trim());
      localStorage.setItem('nometa-user-email', emailInput.trim());
    }
    
    const lutevitaCheckbox = document.getElementById('lutevita-checkbox').checked;
    const customCheckbox = document.getElementById('custom-checkbox').checked;
    const customInput = document.getElementById('custom-supplement-input').value;
    
    setIsLutevitaSelected(lutevitaCheckbox);
    setIsCustomSelected(customCheckbox);
    setCustomSupplementName(customInput);
    
    localStorage.setItem('nometa-lutevita', lutevitaCheckbox.toString());
    localStorage.setItem('nometa-custom-supplement-enabled', customCheckbox.toString());
    localStorage.setItem('nometa-custom-supplement-name', customInput);
    
    if (userEmail) {
      updateSupplementSettings(userEmail, lutevitaCheckbox, customCheckbox, customInput);
    }
    
    const emailTimeInput = document.getElementById('email-reminder-time-input').value;
    const emailEnabledInput = document.getElementById('email-reminder-enabled-checkbox').checked;
    
    setEmailReminderTime(emailTimeInput);
    setEmailReminderEnabled(emailEnabledInput);
    
    localStorage.setItem('nometa-email-reminder-time', emailTimeInput);
    localStorage.setItem('nometa-email-reminder-enabled', emailEnabledInput.toString());
    
    if (userEmail) {
      updateEmailReminderSettings(userEmail, emailTimeInput, emailEnabledInput);
    }
    
    setShowSettings(false);
  };

  // SNSシェア機能
  const shareToTwitter = () => {
    const daysSinceStart = getDaysSinceStart();
    const totalTakenDays = getTotalTakenDays();
    const continuationRate = getTotalContinuationRate();
    
    const text = `nometaで${daysSinceStart}日間サプリメント管理中！\n総服薬日数: ${totalTakenDays}日\n継続率: ${continuationRate}%\n\n健康的な習慣を継続しています✨\n\n#nometa #サプリメント #健康管理 #継続は力なり`;
    
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const shareToFacebook = () => {
    const daysSinceStart = getDaysSinceStart();
    const totalTakenDays = getTotalTakenDays();
    const continuationRate = getTotalContinuationRate();
    
    const text = `nometaでサプリメント管理を${daysSinceStart}日間継続中！総服薬日数${totalTakenDays}日、継続率${continuationRate}%を達成しました。健康的な習慣づくりを頑張っています！`;
    
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
    ctx.fillText('nometa', canvas.width / 2, 200);
    
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
    ctx.fillText('#nometa #健康管理 #継続は力なり', canvas.width / 2, 950);
    
    const link = document.createElement('a');
    link.download = `nometa-share-${new Date().getTime()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  // チュートリアル機能
  const nextTutorialStep = () => {
    if (tutorialStep < tutorialSteps.length - 1) {
      setTutorialStep(tutorialStep + 1);
    } else {
      setShowTutorial(false);
      localStorage.setItem('nometa-tutorial-completed', 'true');
    }
  };

  const skipTutorialToBasic = () => {
    setShowTutorial(false);
    localStorage.setItem('nometa-tutorial-completed', 'true');
  };

  const skipToAdvanced = () => {
    setTutorialStep(4);
  };

  const tutorialSteps = [
    {
      title: "🎉 nometaへようこそ！",
      content: `${userName ? userName + 'さん、' : ''}nometaの基本的な使い方をご紹介します。\n\nまずはシンプルな機能から始めて、毎日の服薬習慣を楽しく身につけましょう！`,
      buttonText: "使い方を見る",
      type: "welcome"
    },
    {
      title: "👋 お名前を教えてください",
      content: "お名前を登録すると、アプリがもっとあなた専用になります。\n\n「こんにちは、○○さん！」のように、パーソナルな挨拶でお迎えします。",
      buttonText: "名前を登録する",
      type: "name"
    },
    {
      title: "📅 サプリを飲んだらチェック！",
      content: "カレンダーの日付をタップして、服薬記録をつけましょう。\n\n✅ 朝・昼・夕・寝る前・その他の時間帯別にチェック可能\n📊 継続率が自動で計算される\n💪 励ましメッセージが表示される",
      buttonText: "次へ",
      type: "basic"
    },
    {
      title: "🎯 基本の使い方はこれだけ！",
      content: "時間帯別チェックで、より詳細な服薬管理ができます。\n\nどの時間帯でも1つでもチェックすれば、その日は服薬完了です！",
      buttonText: "基本機能で始める",
      type: "basic-complete",
      hasAdvancedOption: true
    },
    {
      title: "⚙️ 飲んでいるサプリを登録しよう",
      content: "設定画面でサプリメントを登録すると：\n\n✨ ルテビタなど具体的な名前で記録\n🎯 より正確な管理ができる",
      buttonText: "次へ",
      type: "advanced"
    },
    {
      title: "⏰ リマインダーで飲み忘れ防止",
      content: "時間を設定すると、毎日決まった時間に通知が届きます。\n\n📱 スマホに優しく通知\n⏰ あなたの好きな時間に設定\n🔄 習慣化をサポート",
      buttonText: "すべて完了！",
      type: "advanced"
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
    
    // 空白のセル
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }
    
    // 日付のセル
    for (let day = 1; day <= daysInMonth; day++) {
      const isTaken = getDayTakenStatus(day);
      const isToday = day === today.getDate() && 
                     currentMonth === today.getMonth() && 
                     currentYear === today.getFullYear();
      
      days.push(
        <div
          key={day}
          className={`calendar-day ${isTaken ? 'taken' : ''} ${isToday ? 'today' : ''}`}
          onClick={() => handleDayClick(day)}
        >
          {day}
          {isTaken && <div className="check-mark">✓</div>}
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
              <h3>nometaにログイン</h3>
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
                
                <div className="privacy-notice">
                  <div className="privacy-notice-header">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    個人情報の取扱いについて
                  </div>
                  <div className="privacy-notice-content">
                    <p>ご入力いただいたメールアドレスは、以下の目的でのみ使用いたします：</p>
                    <ul>
                      <li>PINコード送信（ログイン認証用）</li>
                      <li>継続サポートメッセージの配信</li>
                      <li>YURUストアからの商品・サービスのご案内</li>
                      <li>服薬記録の保存（機種変更時のデータ引継ぎ用）</li>
                    </ul>
                    <p>
                      配信停止はいつでも可能です。<br/>
                      詳細は <a href="https://yuru-store.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer">プライバシーポリシー</a> をご確認ください。
                    </p>
                  </div>
                </div>
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
        <h1>nometa</h1>
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
              <p>今月の服薬日数: {Array.from(getCurrentMonthTakenDays().values()).filter(dayData => dayData.morning || dayData.noon || dayData.evening || dayData.bedtime || dayData.other).length}日 / {daysInMonth}日</p>
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
            <h4>nometa</h4>
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
              <label>飲めたチェック</label>
              <div className="time-checkboxes">
                <div className="time-checkbox">
                  <input
                    id="morning-check"
                    type="checkbox"
                    defaultChecked={currentTimeChecks.morning}
                  />
                  <label htmlFor="morning-check">朝</label>
                </div>
                <div className="time-checkbox">
                  <input
                    id="noon-check"
                    type="checkbox"
                    defaultChecked={currentTimeChecks.noon}
                  />
                  <label htmlFor="noon-check">昼</label>
                </div>
                <div className="time-checkbox">
                  <input
                    id="evening-check"
                    type="checkbox"
                    defaultChecked={currentTimeChecks.evening}
                  />
                  <label htmlFor="evening-check">夕</label>
                </div>
                <div className="time-checkbox">
                  <input
                    id="bedtime-check"
                    type="checkbox"
                    defaultChecked={currentTimeChecks.bedtime}
                  />
                  <label htmlFor="bedtime-check">寝る前</label>
                </div>
                <div className="time-checkbox">
                  <input
                    id="other-check"
                    type="checkbox"
                    defaultChecked={currentTimeChecks.other}
                  />
                  <label htmlFor="other-check">その他</label>
                </div>
              </div>
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
                  id="email-reminder-enabled-checkbox"
                  type="checkbox"
                  defaultChecked={emailReminderEnabled}
                  onChange={(e) => {
                    const timeInput = document.getElementById('email-reminder-time-input');
                    timeInput.disabled = !e.target.checked;
                  }}
                />
                メール通知を有効にする
              </label>
            </div>
            
            <div className="modal-section">
              <label htmlFor="email-reminder-time-input">メール通知時刻</label>
              <input
                id="email-reminder-time-input"
                type="time"
                defaultValue={emailReminderTime}
                disabled={!emailReminderEnabled}
              />
              <small>設定した時間に服薬リマインダーのメールが届きます。確実に通知されます。</small>
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
            <div className="tutorial-content">
              {tutorialSteps[tutorialStep].content.split('\n').map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
            
            {/* 名前登録ステップの場合 */}
            {tutorialSteps[tutorialStep].type === 'name' && (
              <div className="tutorial-name-input">
                <input
                  type="text"
                  placeholder="お名前を入力してください"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      const newName = e.target.value.trim();
                      setUserName(newName);
                      localStorage.setItem('nometa-username', newName);
                      
                      // サーバーにも名前を送信
                      if (userEmail) {
                        updateUserNameOnServer(userEmail, newName);
                      }
                      
                      nextTutorialStep();
                    }
                  }}
                />
              </div>
            )}
            
            <div className="tutorial-buttons">
              {tutorialSteps[tutorialStep].type === 'basic-complete' ? (
                <>
                  <button className="btn-primary" onClick={skipTutorialToBasic}>
                    {tutorialSteps[tutorialStep].buttonText}
                  </button>
                  <button className="btn-secondary advanced-btn" onClick={skipToAdvanced}>
                    もっと使いこなしたい
                  </button>
                </>
              ) : tutorialSteps[tutorialStep].type === 'name' ? (
                <>
                  <button 
                    className="btn-secondary" 
                    onClick={nextTutorialStep}
                  >
                    後で設定する
                  </button>
                  <button 
                    className="btn-primary" 
                    onClick={() => {
                      const input = document.querySelector('.tutorial-name-input input');
                      if (input && input.value.trim()) {
                        const newName = input.value.trim();
                        setUserName(newName);
                        localStorage.setItem('nometa-username', newName);
                        
                        // サーバーにも名前を送信
                        if (userEmail) {
                          updateUserNameOnServer(userEmail, newName);
                        }
                        
                        nextTutorialStep();
                      } else {
                        alert('お名前を入力してください');
                      }
                    }}
                  >
                    {tutorialSteps[tutorialStep].buttonText}
                  </button>
                </>
              ) : (
                <>
                  {tutorialStep > 0 && (
                    <button className="btn-secondary" onClick={skipTutorialToBasic}>
                      基本機能で始める
                    </button>
                  )}
                  <button className="btn-primary" onClick={nextTutorialStep}>
                    {tutorialSteps[tutorialStep].buttonText}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
