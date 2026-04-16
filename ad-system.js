(function(window, document) {
	'use strict';

	function debugLog(msg, isError = false) {
		const prefix = isError ? '❌' : '📢';
		console.log(prefix, msg);
		const debugDiv = document.getElementById('ad-debug');
		if (debugDiv) {
			const line = document.createElement('div');
			line.style.color = isError ? '#ff6b6b' : '#0f0';
			line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
			debugDiv.appendChild(line);
			debugDiv.scrollTop = debugDiv.scrollHeight;
		}
	}

	const AdSystem = {
		config: {
			initialDelay: 3000,
			showDuration: 8000,
			hideDuration: 20000,
			positionOptions: [
				{ top: 10, right: 10 },
				{ top: 10, left: 10 },
				{ bottom: 10, right: 10 },
				{ bottom: 10, left: 10 }
			]
		},

		ads: [],
		state: {
			isShowing: false,
			currentAd: null,
			lastAdId: null,
			adQueue: [],
			timers: { showTimer: null, hideTimer: null }
		},
		container: null,
		currentPosition: null,

		checkAndShowAd: function() {
			if (this.isProVersion()) {
				debugLog('会员有效，不显示广告');
				this.stopAds();      // 停止所有广告计时器，隐藏容器
				return;
			}
			if (this.state.isShowing) return;
			if (this.ads.length === 0) {
				debugLog('广告列表为空，等待远程加载');
				// 可选：显示一个“加载中”的占位效果
				return;
			}
			this.showAd();
		},

		showAd: function() {
			let ad;
			let attempts = 0;
			do {
				const idx = Math.floor(Math.random() * this.ads.length);
				ad = this.ads[idx];
				attempts++;
				if (attempts >= this.ads.length * 2) break;
			} while (ad.id === this.state.lastAdId && this.ads.length > 1);

			debugLog(`显示广告: ${ad.title} (ID: ${ad.id})`);
			this.state.lastAdId = ad.id;
			this.state.isShowing = true;
			this.state.currentAd = ad;

			const posIndex = Math.floor(Math.random() * this.config.positionOptions.length);
			this.currentPosition = this.config.positionOptions[posIndex];

			if (!this.container) this.createContainer();
			else this.updateContainerPosition();

			this.container.innerHTML = this.createAdHTML(ad);
			this.container.style.display = 'block';

			if (this.state.timers.showTimer) clearTimeout(this.state.timers.showTimer);
			this.state.timers.showTimer = setTimeout(() => this.hideAd(), this.config.showDuration);
		},

		updateContainerPosition: function() {
			if (!this.container || !this.currentPosition) return;
			const pos = this.currentPosition;
			let styleText = `position: fixed; z-index: 10000; transform: scale(0.85); transform-origin: top right; transition: all 0.3s ease;`;
			if (pos.top !== undefined) styleText += `top: ${pos.top}px;`;
			if (pos.bottom !== undefined) styleText += `bottom: ${pos.bottom}px;`;
			if (pos.left !== undefined) styleText += `left: ${pos.left}px;`;
			if (pos.right !== undefined) styleText += `right: ${pos.right}px;`;
			this.container.style.cssText = styleText;
		},

		hideAd: function() {
			debugLog('隐藏广告');
			this.state.isShowing = false;
			this.state.currentAd = null;
			if (this.container) this.container.style.display = 'none';
			if (this.state.timers.hideTimer) clearTimeout(this.state.timers.hideTimer);
			this.state.timers.hideTimer = setTimeout(() => this.checkAndShowAd(), this.config.hideDuration);
		},

		closeAd: function() {
			debugLog('用户手动关闭广告');
			this.hideAd();
		},

		// 广告卡片宽度 160px（更小巧）
		createAdHTML: function(ad) {
			const baseWidth = 160; // 缩小到 160px
			const imgHeight = baseWidth / (ad.aspectRatio || 16/9);
			return `
				<div style="
					background: white;
					border-radius: 16px;
					padding: 8px;
					width: ${baseWidth}px;
					box-shadow: 0 6px 16px rgba(0,0,0,0.15);
					border: 1px solid rgba(0,0,0,0.05);
					position: relative;
					display: flex;
					flex-direction: column;
					font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
				">
					<button onclick="AdSystem.closeAd()" style="
						position: absolute;
						top: 4px;
						right: 4px;
						background: rgba(0,0,0,0.4);
						color: white;
						border: none;
						border-radius: 50%;
						width: 20px;
						height: 20px;
						cursor: pointer;
						font-size: 12px;
						display: flex;
						align-items: center;
						justify-content: center;
						z-index: 101;
						backdrop-filter: blur(2px);
					">×</button>
					
					<div style="
						width: 100%;
						height: ${imgHeight}px;
						overflow: hidden;
						border-radius: 12px;
						margin-bottom: 6px;
						background: #f5f5f5;
					">
						<img src="${ad.image}" 
							 alt="${ad.title}"
							 style="
								 width: 100%;
								 height: 100%;
								 object-fit: cover;
								 object-position: center;
							 "
							 onerror="this.src='https://via.placeholder.com/300x200?text=${encodeURIComponent(ad.title)}'">
					</div>
					
					<div style="flex:1;">
						<h3 style="margin:0 0 2px 0; font-size:13px; font-weight:600; color:#222; line-height:1.3;">${ad.title}</h3>
						<p style="margin:0 0 4px 0; font-size:10px; color:#666; line-height:1.4;">${ad.description}</p>
					</div>
					
					<button onclick="AdSystem.handleClick(${ad.id})" style="
						background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
						color: white;
						border: none;
						border-radius: 30px;
						padding: 5px 0;
						width: 100%;
						cursor: pointer;
						font-size: 11px;
						font-weight: 500;
						margin-bottom: 6px;
						transition: opacity 0.2s;
					" onmouseover="this.style.opacity=0.9" onmouseout="this.style.opacity=1">查看</button>
					
					<div style="
						display: flex;
						align-items: center;
						gap: 4px;
						padding: 4px 6px;
						background: #f0f2f5;
						border-radius: 30px;
						font-size: 9px;
						color: #444;
					">
						<span>⏱️</span>
						<div style="flex:1; height:3px; background:#d0d4d9; border-radius:2px; overflow:hidden;">
							<div style="height:100%; background:linear-gradient(90deg, #4CAF50, #8BC34A); width:100%; animation:progress ${this.config.showDuration/1000}s linear forwards;"></div>
						</div>
						<span>${this.config.showDuration/1000}秒</span>
					</div>
					
					<style>
						@keyframes progress {
							from { width: 100%; }
							to { width: 0%; }
						}
					</style>
				</div>
			`;
		},

		createContainer: function() {
			this.container = document.createElement('div');
			this.container.id = 'simple-ad-container';
			document.body.appendChild(this.container);
			this.updateContainerPosition();
			debugLog('广告容器已创建');
		},

		handleClick: function(adId) {
			const ad = this.ads.find(a => a.id === adId);
			if (!ad) return;
			debugLog(`点击广告: ${ad.title}`);
			localStorage.setItem('ad_click_record', JSON.stringify({
				timestamp: Date.now(),
				adId: ad.id,
				status: 'clicked'
			}));
			this.hideAd();
			setTimeout(() => window.open(ad.link, '_blank'), 100);
		},

		isProVersion: function() {
			// 优先使用新的会员判断
			if (window.TimeLimitSystem && typeof TimeLimitSystem.isMembershipValid === 'function') {
				return TimeLimitSystem.isMembershipValid();
			}
			// 降级方案：检查旧的专业版存储
			try {
				const pro = localStorage.getItem('pro_version');
				return pro ? JSON.parse(pro).activated === true : false;
			} catch(e) {
				return false;
			}
		},

		fetchRemoteAds: function() {
			debugLog('使用本地广告数据');
			this.ads = [
				{ id: 1, title: "下载站", description: "应用资料免费下载", image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80", link: "https://ningchaojie.github.io", aspectRatio: 1.7777777777777777 },
				{ id: 2, title: "天猫触屏电容笔", description: "iPad/平板通用，免运费", image: "https://raw.githubusercontent.com/ningchaojie/ningchaojie.github.io/main/%E8%A7%A6%E6%91%B8%E7%AC%94.png", link: "https://e.tb.cn/h.7quPuKtqo7oBgPT", aspectRatio: 0.75 },
				{ id: 3, title: "触摸笔", description: "iPad/平板通用，免运费", image: "https://images.unsplash.com/photo-1509228468518-180dd4864904?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80", link: "https://e.tb.cn/h.7OBJNA3SnYFXa2z", aspectRatio: 1.7777777777777777 },
				{ id: 4, title: "三星 Note8 手机", description: "国行双卡note9全网通4G曲屏手机", image: "https://ningchaojie.github.io/20260220_020302.jpg", link: "https://e.tb.cn/h.7yk7Yxivt4gPMeh?tk=2kPkUoOgzK6", aspectRatio: 0.75 },
				{ id: 5, title: "文档编辑器v1.1", description: "专业文档编辑器", image: "https://ningchaojie.github.io/文档编辑器APP图标.jpg", link: "https://ningchaojie.github.io/文档编辑器v1.1介绍.html", aspectRatio: 1.0 },
				{ id: 6, title: "文档编辑器v1.0", description: "专业文档编辑器", image: "https://ningchaojie.github.io/文档编辑器APP图标.jpg", link: "https://ningchaojie.github.io/文档编辑介绍.html", aspectRatio: 1.0 }
			];
			this.initAdQueue();
			debugLog(`✅ 本地广告加载完成，共 ${this.ads.length} 个`);
			if (!this.state.isShowing) this.checkAndShowAd();
		},

		saveAdsToCache: function(ads) {
			try {
				localStorage.setItem('cached_ads', JSON.stringify({ data: ads, timestamp: Date.now() }));
				debugLog('广告已缓存到本地');
			} catch(e) {
				debugLog('缓存广告失败', true);
			}
		},

		loadAdsFromCache: function() {
			try {
				const cached = localStorage.getItem('cached_ads');
				if (!cached) return null;
				const { data, timestamp } = JSON.parse(cached);
				if (Date.now() - timestamp > 7*24*60*60*1000) {
					debugLog('缓存广告已过期');
					return null;
				}
				debugLog('从缓存加载广告成功');
				return data;
			} catch(e) {
				debugLog('从缓存加载广告失败', true);
				return null;
			}
		},

		initAdQueue: function() {
			if (this.ads.length > 0) {
				this.state.adQueue = [...this.ads].sort(() => Math.random() - 0.5);
				debugLog(`广告队列初始化，共 ${this.ads.length} 个广告`);
			} else {
				this.state.adQueue = [];
			}
		},

		init: function() {
			debugLog('🚀 启动广告系统');
			if (this.isProVersion()) {
				debugLog('专业版用户，跳过广告');
				return;
			}

			const cached = this.loadAdsFromCache();
			if (cached) {
				this.ads = cached;
				this.initAdQueue();
				setTimeout(() => {
					if (!this.state.isShowing) this.checkAndShowAd();
				}, 1000);
			}

			this.fetchRemoteAds();

			setTimeout(() => {
				debugLog('首次广告显示尝试');
				this.checkAndShowAd();
			}, this.config.initialDelay);

			setInterval(() => {
				if (!this.state.isShowing && !this.isProVersion() && this.ads.length > 0) {
					debugLog('定期检查广告');
					this.checkAndShowAd();
				}
			}, 90000);
		},

		stopAds: function() {
			if (this.state.timers.showTimer) clearTimeout(this.state.timers.showTimer);
			if (this.state.timers.hideTimer) clearTimeout(this.state.timers.hideTimer);
			if (this.container) this.container.style.display = 'none';
			this.state.isShowing = false;
			this.state.currentAd = null;
			debugLog('所有广告已停止');
		},

		debugShowAd: function() {
			debugLog('手动触发显示广告');
			this.checkAndShowAd();
		}
	};

	window.AdSystem = AdSystem;

	document.addEventListener('DOMContentLoaded', () => {
		setTimeout(() => AdSystem.init(), 2000);
	});
})(window, document);