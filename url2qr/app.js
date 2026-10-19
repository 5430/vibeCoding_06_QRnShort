/**
 * URL2QR - Application Logic
 * Dynamic QR Code Generation, High-Quality JPG Export,
 * and Interactive Mouse-Tracking Gradient Background
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const body = document.body;
  const urlForm = document.getElementById('url-form');
  const urlInput = document.getElementById('url-input');
  const clearInputBtn = document.getElementById('clear-input-btn');
  const submitBtn = document.getElementById('submit-btn');
  const qrCanvasBox = document.getElementById('qr-canvas-box');
  const qrCard = document.getElementById('qr-card');
  const targetUrlLabel = document.getElementById('target-url-label');
  const btnDownloadJpg = document.getElementById('btn-download-jpg');
  const btnCopyUrl = document.getElementById('btn-copy-url');
  const btnReset = document.getElementById('btn-reset');
  const logoRefreshBtn = document.getElementById('logo-refresh-btn');
  const toastContainer = document.getElementById('toast-container');
  const mouseGlow = document.getElementById('mouse-glow');
  const blob1 = document.querySelector('.blob-1');
  const blob2 = document.querySelector('.blob-2');
  const blob3 = document.querySelector('.blob-3');

  let qrCodeInstance = null;
  let currentTargetUrl = '';

  // ==========================================================================
  // 마우스 커서 반응형 그라데이션 인터랙션 (LERP 부드러운 보간 적용)
  // ==========================================================================
  let targetMouseX = window.innerWidth / 2;
  let targetMouseY = window.innerHeight / 2;
  let currentMouseX = targetMouseX;
  let currentMouseY = targetMouseY;

  window.addEventListener('mousemove', (e) => {
    targetMouseX = e.clientX;
    targetMouseY = e.clientY;
  });

  window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      targetMouseX = e.touches[0].clientX;
      targetMouseY = e.touches[0].clientY;
    }
  }, { passive: true });

  function animateGradient() {
    // 선형 보간으로 부드러운 움직임 생성 (lerp factor: 0.08)
    currentMouseX += (targetMouseX - currentMouseX) * 0.08;
    currentMouseY += (targetMouseY - currentMouseY) * 0.08;

    const width = window.innerWidth || 1;
    const height = window.innerHeight || 1;

    const xPercent = (currentMouseX / width) * 100;
    const yPercent = (currentMouseY / height) * 100;

    // CSS 변수 업데이트
    document.documentElement.style.setProperty('--mouse-x', `${xPercent.toFixed(2)}%`);
    document.documentElement.style.setProperty('--mouse-y', `${yPercent.toFixed(2)}%`);

    // 시차(Parallax) 오로라 블롭 이동 효과
    if (blob1 && blob2 && blob3) {
      const offsetX = (currentMouseX - width / 2) * 0.04;
      const offsetY = (currentMouseY - height / 2) * 0.04;

      blob1.style.transform = `translate(${offsetX * 1.2}px, ${offsetY * 1.2}px)`;
      blob2.style.transform = `translate(${-offsetX * 0.8}px, ${-offsetY * 0.8}px)`;
      blob3.style.transform = `translate(${-offsetX * 1.5}px, ${offsetY * 0.9}px)`;
    }

    requestAnimationFrame(animateGradient);
  }

  requestAnimationFrame(animateGradient);

  // ==========================================================================
  // QR 코드 생성 로직
  // ==========================================================================

  /**
   * QR 코드 생성 함수
   * @param {string} rawInput 
   */
  function generateQRCode(rawInput) {
    let url = rawInput.trim();
    if (!url) {
      showToast('URL 또는 내용을 입력해 주세요.', 'info');
      urlInput.focus();
      return;
    }

    // URL 형식 보정 (영문 도메인 형태인 경우 https:// 자동 부착)
    if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(url) && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    currentTargetUrl = url;
    targetUrlLabel.textContent = url;
    targetUrlLabel.title = url;

    // 기존 캔버스 박스 비우기
    qrCanvasBox.innerHTML = '';

    try {
      if (typeof QRCode !== 'undefined') {
        // QRCodejs 라이브러리를 통한 QR 코드 생성
        qrCodeInstance = new QRCode(qrCanvasBox, {
          text: url,
          width: 256,
          height: 256,
          colorDark: '#1e1b18',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.H
        });
      } else {
        // Fallback: QRCode 라이브러리가 로드되지 않은 경우 Image Fallback
        const img = document.createElement('img');
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(url)}`;
        img.alt = 'QR Code';
        img.crossOrigin = 'Anonymous';
        qrCanvasBox.appendChild(img);
      }

      // 상태 전환 애니메이션 실행 (초기 상태 -> 생성 완료 상태)
      body.classList.remove('state-initial');
      body.classList.add('state-generated');

      showToast('QR코드가 멋지게 생성되었습니다!', 'success');

      // Lucide 아이콘 새로고침
      if (window.lucide) {
        lucide.createIcons();
      }
    } catch (err) {
      console.error('QR Code Generation Error:', err);
      showToast('QR코드 생성 중 오류가 발생했습니다.', 'info');
    }
  }

  /**
   * QR 코드를 여백이 포함된 고화질 JPG 파일로 변환하여 다운로드
   */
  function downloadQRCodeAsJPG() {
    if (!currentTargetUrl) {
      showToast('다운로드할 QR코드가 없습니다.', 'info');
      return;
    }

    const canvasElement = qrCanvasBox.querySelector('canvas');
    const imgElement = qrCanvasBox.querySelector('img');

    if (!canvasElement && !imgElement) {
      showToast('QR코드 이미지를 생성 중입니다. 잠시 후 다시 시도해 주세요.', 'info');
      return;
    }

    // 고해상도 오프스크린 캔버스 생성 (800x800)
    const exportCanvas = document.createElement('canvas');
    const exportSize = 800;
    const padding = 80;
    const qrSize = exportSize - (padding * 2);

    exportCanvas.width = exportSize;
    exportCanvas.height = exportSize;
    const ctx = exportCanvas.getContext('2d');

    // 1. 순백색(#FFFFFF) 배경 채우기
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, exportSize, exportSize);

    // 2. 앤티앨리어싱 설정 (QR 선명도 유지)
    ctx.imageSmoothingEnabled = false;

    const finalizeAndDownload = (sourceDrawable) => {
      // QR 코드를 중앙에 배치
      ctx.drawImage(sourceDrawable, padding, padding, qrSize, qrSize);

      // JPG 데이터 URL 생성 (고품질 0.98)
      const jpgDataUrl = exportCanvas.toDataURL('image/jpeg', 0.98);

      // 파일명 생성: qrcode_도메인.jpg
      let cleanName = 'url2qr';
      try {
        const urlObj = new URL(currentTargetUrl);
        cleanName = `url2qr_${urlObj.hostname.replace(/[^a-zA-Z0-9]/g, '_')}`;
      } catch (e) {
        cleanName = `url2qr_${Date.now().toString().slice(-6)}`;
      }
      const filename = `${cleanName}.jpg`;

      // 가상 링크 다운로드 트리거
      const downloadLink = document.createElement('a');
      downloadLink.href = jpgDataUrl;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      showToast(`'${filename}' 고화질 JPG가 저장되었습니다.`, 'success');
    };

    if (canvasElement) {
      finalizeAndDownload(canvasElement);
    } else if (imgElement) {
      if (imgElement.complete && imgElement.naturalWidth !== 0) {
        finalizeAndDownload(imgElement);
      } else {
        imgElement.onload = () => finalizeAndDownload(imgElement);
      }
    }
  }

  /**
   * URL 클립보드 복사
   */
  async function copyCurrentUrl() {
    if (!currentTargetUrl) return;
    try {
      await navigator.clipboard.writeText(currentTargetUrl);
      showToast('URL이 클립보드에 복사되었습니다.', 'success');
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = currentTargetUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showToast('URL이 클립보드에 복사되었습니다.', 'success');
    }
  }

  /**
   * 초기 화면으로 리셋
   */
  function resetToInitial() {
    body.classList.remove('state-generated');
    body.classList.add('state-initial');
    urlInput.value = '';
    currentTargetUrl = '';
    clearInputBtn.style.display = 'none';
    urlInput.focus();
    showToast('새로운 QR코드를 생성할 수 있습니다.', 'info');
  }

  /**
   * 토스트 메시지 표시 헬퍼
   * @param {string} message 
   * @param {'success'|'info'} type 
   */
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const iconName = type === 'success' ? 'check-circle-2' : 'info';
    toast.innerHTML = `
      <i data-lucide="${iconName}" class="toast-icon"></i>
      <span>${message}</span>
    `;

    toastContainer.appendChild(toast);
    if (window.lucide) {
      lucide.createIcons({ root: toast });
    }

    setTimeout(() => {
      toast.classList.add('toast-hide');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3200);
  }

  // ==========================================================================
  // Event Listeners
  // ==========================================================================

  // 1. 폼 제출 및 확인 버튼 클릭 시 QR 생성
  urlForm.addEventListener('submit', (e) => {
    e.preventDefault();
    generateQRCode(urlInput.value);
  });

  // 2. 인풋 입력 감지
  urlInput.addEventListener('input', () => {
    clearInputBtn.style.display = urlInput.value.trim() ? 'flex' : 'none';
  });

  // 3. 클리어 버튼 클릭
  clearInputBtn.addEventListener('click', () => {
    urlInput.value = '';
    clearInputBtn.style.display = 'none';
    urlInput.focus();
  });

  // 4. QR 코드 클릭 시 JPG 다운로드
  qrCard.addEventListener('click', () => {
    downloadQRCodeAsJPG();
  });

  // 5. JPG 다운로드 버튼 클릭
  btnDownloadJpg.addEventListener('click', () => {
    downloadQRCodeAsJPG();
  });

  // 6. URL 복사 버튼 클릭
  btnCopyUrl.addEventListener('click', () => {
    copyCurrentUrl();
  });

  // 7. 새로 만들기 버튼 및 로고 클릭
  btnReset.addEventListener('click', resetToInitial);
  logoRefreshBtn.addEventListener('click', resetToInitial);

  // URL 쿼리 파라미터(?url=...) 자동 처리
  const urlParams = new URLSearchParams(window.location.search);
  const paramUrl = urlParams.get('url') || urlParams.get('text');
  if (paramUrl) {
    urlInput.value = paramUrl;
    clearInputBtn.style.display = 'flex';
    generateQRCode(paramUrl);
  } else {
    // 초기 포커스
    urlInput.focus();
  }
});

