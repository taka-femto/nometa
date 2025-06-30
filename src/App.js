import React, { useState } from 'react';
import './App.css';

function App() {
  // 今日の日付を取得
  const today = new Date();
  
  // 表示中の月と年の状態
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  
  // 服薬記録を保存する状態（月ごとに管理）
  const [takenDays, setTakenDays] = useState(new Map());
  
  // メモを保存する状態（月ごとに管理）
  const [memos, setMemos] = useState(new Map());
  
  // 服薬開始日
  const [startDate, setStartDate] = useState(null);
  
  // リマインダー設定
  const [reminderTime, setReminderTime] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  
  // ユーザー情報
  const [userName, setUserName] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);
  
  // チュートリアル状態
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  
  // モーダルの状態
  const [showModal, setShowModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [currentMemo, setCurrentMemo] = useState('');
  
  // 設定モーダルの状態
  const [showSettings, setShowSettings] = useState(false);
  
  // 初回起動時にローカルストレージからデータを読み込み
  React.useEffect(() => {
    // ユーザー名を読み込み
    const savedUserName = localStorage.getItem('nonda-username');
    if (savedUserName) {
      setUserName(savedUserName);
    } else {
      setShowWelcome(true);
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
  }, []);
  
  // 月の日数を取得
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  
  // 月の一意キーを生成
  const getMonthKey = (year, month) => `${year}-${month}`;
  
  // 現在表示中の月のキー
  const currentMonthKey = getMonthKey(currentYear, currentMonth);
  
  // 現在の月の服薬記録を取得
  const getCurrentMonthTakenDays = () => {
    return takenDays.get(currentMonthKey) || new Set();
  };
  
  // 現在の月のメモを取得
  const getCurrentMonthMemos = () => {
    return memos.get(currentMonthKey) || new Map();
  };
  
  // 総服薬日数を計算
  const getTotalTakenDays = () => {
    let total = 0;
    for (const monthTakenDays of takenDays.values()) {
      total += monthTakenDays.size;
    }
    return total;
  };
  
  // トータル継続率を計算
  const getTotalContinuationRate = () => {
    if (!startDate) return 0;
    const daysSinceStart = getDaysSinceStart();
    const totalTakenDays = getTotalTakenDays();
    return Math.round((totalTakenDays / daysSinceStart) * 100);
  };
  
  // 服薬開始からの日数を計算
  const getDaysSinceStart = () => {
    if (!startDate) return 0;
    const today = new Date();
    const diffTime = today - startDate;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };
  
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
  
  // 前の月に移動
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };
  
  // 次の月に移動
  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };
  
  // 今月に戻る
  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };
  
  // 月名
  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ];
  
  // 日付をクリックした時の処理
  const handleDayClick = (day) => {
    setSelectedDay(day);
    const currentMemos = getCurrentMonthMemos();
    setCurrentMemo(currentMemos.get(day) || '');
    setShowModal(true);
  };
  
  // モーダルを閉じる
  const closeModal = () => {
    setShowModal(false);
    setSelectedDay(null);
    setCurrentMemo('');
  };
  
  // 服薬記録とメモを保存
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
  
  // ローカルストレージにデータを保存
  const saveToLocalStorage = (takenDaysMap, memosMap) => {
    // 服薬記録を保存（SetをArrayに変換）
    const takenDaysObj = {};
    for (const [key, value] of takenDaysMap.entries()) {
      takenDaysObj[key] = Array.from(value);
    }
    localStorage.setItem('nonda-taken-days', JSON.stringify(takenDaysObj));
    
    // メモを保存（MapをObjectに変換）
    const memosObj = {};
    for (const [key, value] of memosMap.entries()) {
      memosObj[key] = Object.fromEntries(value);
    }
    localStorage.setItem('nonda-memos', JSON.stringify(memosObj));
  };
  
  // 設定を保存
  const saveSettings = () => {
    const dateInput = document.getElementById('start-date-input').value;
    if (dateInput) {
      const newStartDate = new Date(dateInput);
      setStartDate(newStartDate);
      localStorage.setItem('nonda-start-date', newStartDate.toISOString());
    }
    
    const nameInput = document.getElementById('username-input').value;
    if (nameInput.trim()) {
      setUserName(nameInput.trim());
      localStorage.setItem('nonda-username', nameInput.trim());
    }
    
    const timeInput = document.getElementById('reminder-time-input').value;
    const enabledInput = document.getElementById('reminder-enabled-checkbox').checked;
    
    setReminderTime(timeInput);
    setReminderEnabled(enabledInput);
    
    // ローカルストレージに保存
    localStorage.setItem('nonda-reminder-time', timeInput);
    localStorage.setItem('nonda-reminder-enabled', enabledInput.toString());
    
    if (enabledInput && timeInput) {
      setupDailyReminder(timeInput);
    } else {
      clearDailyReminder();
    }
    
    setShowSettings(false);
  };
  
  // 初回ウェルカムメッセージの保存
  const saveWelcomeData = () => {
    const nameInput = document.getElementById('welcome-name-input').value;
    if (nameInput.trim()) {
      setUserName(nameInput.trim());
      localStorage.setItem('nonda-username', nameInput.trim());
      setShowWelcome(false);
      
      // チュートリアルがまだ表示されていない場合は表示
      const tutorialCompleted = localStorage.getItem('nonda-tutorial-completed');
      if (!tutorialCompleted) {
        setShowTutorial(true);
        setTutorialStep(0);
      }
    }
  };
  
  // チュートリアルを次のステップに進める
  const nextTutorialStep = () => {
    if (tutorialStep < tutorialSteps.length - 1) {
      setTutorialStep(tutorialStep + 1);
    } else {
      // チュートリアル完了
      setShowTutorial(false);
      localStorage.setItem('nonda-tutorial-completed', 'true');
    }
  };
  
  // チュートリアルをスキップ
  const skipTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('nonda-tutorial-completed', 'true');
  };
  
  // チュートリアルステップの定義
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
  
  // 通知許可を要求
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  };
  
  // 日次リマインダーを設定
  const setupDailyReminder = async (time) => {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      alert('通知を有効にするには、ブラウザの設定で通知を許可してください。');
      return;
    }
    
    // 既存のタイマーをクリア
    clearDailyReminder();
    
    // 毎分チェックして、設定時間になったら通知
    const intervalId = setInterval(() => {
      const now = new Date();
      const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                         now.getMinutes().toString().padStart(2, '0');
      
      if (currentTime === time) {
        showNotification();
      }
    }, 60000); // 1分ごとにチェック
    
    // intervalIdを保存（実際のアプリではlocalStorageなどに保存）
    window.reminderInterval = intervalId;
  };
  
  // リマインダーをクリア
  const clearDailyReminder = () => {
    if (window.reminderInterval) {
      clearInterval(window.reminderInterval);
      window.reminderInterval = null;
    }
  };
  
  // 通知を表示
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
    
    // Canvasのサイズ設定（Instagram正方形）
    canvas.width = 1080;
    canvas.height = 1080;
    
    // 背景色
    ctx.fillStyle = '#667eea';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // グラデーション背景
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // タイトル
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('nonda', canvas.width / 2, 200);
    
    // サブタイトル
    ctx.font = '48px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('サプリメント服薬記録', canvas.width / 2, 280);
    
    // 統計情報
    const daysSinceStart = getDaysSinceStart();
    const totalTakenDays = getTotalTakenDays();
    const continuationRate = getTotalContinuationRate();
    
    ctx.font = 'bold 64px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`${daysSinceStart}日間継続中`, canvas.width / 2, 450);
    
    ctx.font = '52px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`総服薬日数: ${totalTakenDays}日`, canvas.width / 2, 550);
    ctx.fillText(`継続率: ${continuationRate}%`, canvas.width / 2, 630);
    
    // 励ましメッセージ
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
    
    // ハッシュタグ
    ctx.font = '36px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('#nonda #健康管理 #継続は力なり', canvas.width / 2, 950);
    
    // 画像をダウンロード
    const link = document.createElement('a');
    link.download = `nonda-share-${new Date().getTime()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };
  
  // カレンダーの日付を生成
  const renderCalendar = () => {
    const days = [];
    const currentTakenDays = getCurrentMonthTakenDays();
    const currentMemos = getCurrentMonthMemos();
    
    // 空白のセルを追加（月の最初の日まで）
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }
    
    // 日付のセルを追加
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
  
  return (
    <div className="App">
      <header className="app-header">
        <h1>nonda</h1>
        <p>サプリメント服薬記録</p>
        {userName && <p className="welcome-text">こんにちは、{userName}さん！</p>}
        <button className="settings-btn" onClick={() => setShowSettings(true)}>
          ⚙️ 設定
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
      
      {/* モーダル */}
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
                    saveWelcomeData();
                  }
                }}
              />
            </div>
            
            <div className="modal-buttons">
              <button className="btn-primary" onClick={saveWelcomeData}>
                始める
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
          </div>
        </div>
      )}
    </div>
  );
}

export default App;