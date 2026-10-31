import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "../../i18n";

/**
 * Tìm container có thanh cuộn gần nhất của phần tử
 */
function getScrollParent(node) {
  if (!node) return null;
  let parent = node.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const style = window.getComputedStyle(parent);
    if (style.overflowY === "auto" || style.overflowY === "scroll") {
      return parent;
    }
    parent = parent.parentElement;
  }
  return window;
}

export default function OnboardingTour({
  isOpen = false,
  onClose,
  steps = [],
  initialStep = 0,
  tourKey = "autotrader_tour_completed_v1",
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(initialStep);
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({
    top: 0,
    left: 0,
    bottom: 0,
    placement: "docked-bottom",
    isDocked: true,
  });
  const tooltipRef = useRef(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  const { t } = useTranslation();

  // Đồng bộ bước khởi đầu khi mở tour
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(initialStep);
    }
  }, [isOpen, initialStep]);

  const currentStep = steps[currentStepIndex] || null;

  /**
   * Cuộn phần tử mục tiêu vào vùng an toàn - CHỈ GỌI 1 LẦN KHI ĐỔI BƯỚC
   * Tuyệt đối không gọi trong event listener scroll!
   */
  const scrollTargetIntoSafeView = useCallback((el, placement = "bottom") => {
    if (!el) return;
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const isMobileOrNarrow = winW < 768 || winH < 720;
    const scrollParent = getScrollParent(el);

    // Trên desktop rộng, nếu target ở ngoài và card đặt cạnh bên:
    if (!isMobileOrNarrow && (placement === "right" || placement === "left")) {
      const rect = el.getBoundingClientRect();
      if (rect.top < 60 || rect.bottom > winH - 60) {
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      }
      return;
    }

    // Trên mobile hoặc khi card docked:
    if (scrollParent && scrollParent !== window) {
      const parentRect = scrollParent.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const currentScrollTop = scrollParent.scrollTop;
      const relativeTop = elRect.top - parentRect.top;

      if (placement === "top") {
        // Khi card nằm ở đỉnh màn hình: Cuộn phần tử sao cho đỉnh phần tử nằm dưới Card Tooltip (~140px)
        const targetScrollTop = currentScrollTop + relativeTop - 140;
        scrollParent.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: "smooth",
        });
      } else {
        // Khi card nằm ở đáy: Cuộn phần tử lên gần đỉnh scrollParent (~15px)
        const targetScrollTop = currentScrollTop + relativeTop - 15;
        scrollParent.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: "smooth",
        });
      }
    } else {
      const elRect = el.getBoundingClientRect();
      const currentScrollY = window.scrollY || window.pageYOffset;
      const desiredOffsetFromTop = placement === "top" ? 170 : 65;
      const targetScrollY = currentScrollY + elRect.top - desiredOffsetFromTop;
      window.scrollTo({
        top: Math.max(0, targetScrollY),
        behavior: "smooth",
      });
    }
  }, []);

  /**
   * Tính toán vị trí phần tử mục tiêu và đặt tooltip card:
   * shouldScroll = true khi chuyển bước
   * shouldScroll = false khi người dùng chủ động cuộn
   */
  const updateTargetPosition = useCallback(
    (shouldScroll = false) => {
      if (!isOpen || !currentStep) return;

      let el = null;
      let allEls = [];
      if (typeof currentStep.target === "string") {
        allEls = Array.from(document.querySelectorAll(currentStep.target));
        el = allEls[0] || null;
      } else if (currentStep.target && currentStep.target.current) {
        el = currentStep.target.current;
        allEls = [el];
      }

      if (!el) {
        setTargetRect(null);
        setTooltipPos({
          top: Math.max(40, (window.innerHeight - 250) / 2),
          left: Math.max(20, (window.innerWidth - 350) / 2),
          bottom: 0,
          placement: "center",
          isDocked: false,
        });
        return;
      }

      // Ưu tiên chọn phần tử chức năng cụ thể để cuộn (tránh chọn trúng Header cố định)
      const targetToScroll = allEls.find((e) => e.getAttribute && e.getAttribute("data-tour") && !e.getAttribute("data-tour").includes("tab-bar")) || allEls[allEls.length - 1] || el;

      if (shouldScroll) {
        scrollTargetIntoSafeView(targetToScroll, currentStep.placement);
      }

      let top, left, right, bottom;
      if (allEls.length > 1) {
        const rects = allEls.map((e) => e.getBoundingClientRect());
        top = Math.min(...rects.map((r) => r.top));
        left = Math.min(...rects.map((r) => r.left));
        right = Math.max(...rects.map((r) => r.right));
        bottom = Math.max(...rects.map((r) => r.bottom));
      } else {
        const rect = el.getBoundingClientRect();
        top = rect.top;
        left = rect.left;
        right = rect.right;
        bottom = rect.bottom;
      }

      const padding = currentStep.padding !== undefined ? currentStep.padding : 12;

      // Xử lý các tiêu đề dạng QGroupBox nhô lên ngoài khung viền trên
      const titleEl = el.querySelector && el.querySelector(".settings-group-title");
      if (titleEl) {
        const titleRect = titleEl.getBoundingClientRect();
        if (titleRect.top < top) top = titleRect.top;
        if (titleRect.left < left) left = titleRect.left;
        if (titleRect.right > right) right = titleRect.right;
        if (titleRect.bottom > bottom) bottom = titleRect.bottom;
      }

      const padTop = currentStep.paddingTop !== undefined ? currentStep.paddingTop : (titleEl ? padding + 6 : padding);
      const padBottom = currentStep.paddingBottom !== undefined ? currentStep.paddingBottom : padding;
      const padLeft = currentStep.paddingLeft !== undefined ? currentStep.paddingLeft : padding;
      const padRight = currentStep.paddingRight !== undefined ? currentStep.paddingRight : padding;

      const computedRect = {
        top: Math.max(0, top - padTop),
        left: Math.max(0, left - padLeft),
        right: right + padRight,
        bottom: bottom + padBottom,
        width: right + padRight - Math.max(0, left - padLeft),
        height: bottom + padBottom - Math.max(0, top - padTop),
      };

      setTargetRect(computedRect);

      const winW = window.innerWidth;
      const winH = window.innerHeight;
      const cardW = tooltipRef.current && tooltipRef.current.offsetWidth > 0 ? tooltipRef.current.offsetWidth : 350;
      const cardH = tooltipRef.current && tooltipRef.current.offsetHeight > 0 ? tooltipRef.current.offsetHeight : 240;
      const isMobileOrNarrow = winW < 768 || winH < 720;

      const actualCardW = tooltipRef.current && tooltipRef.current.offsetWidth > 0 ? tooltipRef.current.offsetWidth : (isMobileOrNarrow ? Math.min(winW - 24, 380) : 315);
      const actualCardH = tooltipRef.current && tooltipRef.current.offsetHeight > 0 ? tooltipRef.current.offsetHeight : 140;

      // 1. Kiểm tra vị trí ngang trên màn hình Desktop rộng:
      if (!isMobileOrNarrow && currentStep.placement === "right" && winW - computedRect.right >= actualCardW + 20) {
        let cardTop = computedRect.top + (computedRect.height - actualCardH) / 2;
        cardTop = Math.max(12, Math.min(cardTop, winH - actualCardH - 12));
        setTooltipPos({
          top: cardTop,
          left: computedRect.right + 12,
          bottom: 0,
          placement: "right",
          isDocked: false,
        });
        return;
      }

      if (!isMobileOrNarrow && currentStep.placement === "left" && computedRect.left >= actualCardW + 20) {
        let cardTop = computedRect.top + (computedRect.height - actualCardH) / 2;
        cardTop = Math.max(12, Math.min(cardTop, winH - actualCardH - 12));
        setTooltipPos({
          top: cardTop,
          left: computedRect.left - actualCardW - 12,
          bottom: 0,
          placement: "left",
          isDocked: false,
        });
        return;
      }

      // 2. Chế độ BÁM SÁT CHỦ THỂ (Attached Contextual Tooltip - Sát phía trên hoặc phía dưới):
      const wantTop = currentStep.placement === "top";
      const wantBottom = currentStep.placement === "bottom";
      const spaceAbove = computedRect.top;
      const spaceBelow = winH - computedRect.bottom;

      let useTop = wantTop;
      if (!wantTop && !wantBottom) {
        useTop = spaceAbove > spaceBelow;
      }

      // Căn giữa card theo chiều ngang chủ thể
      let cardLeft = isMobileOrNarrow ? 12 : computedRect.left + (computedRect.width - actualCardW) / 2;
      cardLeft = Math.max(12, Math.min(cardLeft, winW - actualCardW - 12));

      let cardTop;
      if (useTop) {
        // Nằm ngay phía TRÊN đỉnh chủ thể, cách 10px
        cardTop = computedRect.top - actualCardH - 10;
        cardTop = Math.max(10, Math.min(cardTop, winH - actualCardH - 10));
      } else if (currentStep.dockBottom) {
        // Đưa nội dung xuống dưới cùng màn hình theo yêu cầu CEO
        cardTop = winH - actualCardH - 12;
      } else {
        // Nằm ngay phía DƯỚI đáy chủ thể, cách 10px
        cardTop = computedRect.bottom + 10;
        cardTop = Math.max(10, Math.min(cardTop, winH - actualCardH - 10));
      }

      setTooltipPos({
        top: cardTop,
        left: cardLeft,
        bottom: 0,
        placement: useTop ? "docked-top" : "docked-bottom",
        isDocked: true,
      });
    },
    [isOpen, currentStep, scrollTargetIntoSafeView]
  );

  // Kích hoạt bước mới: preStep -> scroll -> update
  useEffect(() => {
    if (!isOpen) return;

    if (currentStep && typeof currentStep.preStep === "function") {
      try {
        currentStep.preStep();
      } catch (err) {
        console.error("[Tour] PreStep error:", err);
      }
    }

    // Nhịp 1 (60ms): Đợi Modal hoặc DOM render xong rồi cuộn thông minh 1 lần duy nhất
    const timer1 = setTimeout(() => {
      updateTargetPosition(true);
    }, 60);

    // Nhịp 2 (220ms) & Nhịp 3 (450ms): Đo lại toạ độ chính xác sau khi hiệu ứng cuộn hoàn tất
    const timer2 = setTimeout(() => {
      updateTargetPosition(false);
    }, 220);

    const timer3 = setTimeout(() => {
      updateTargetPosition(false);
    }, 450);

    // Lắng nghe sự kiện người dùng chủ động cuộn: CHỈ update spotlight, KHÔNG scrollIntoView
    const handleScroll = () => {
      isScrollingRef.current = true;
      updateTargetPosition(false); // shouldScroll = false!
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        isScrollingRef.current = false;
        updateTargetPosition(false);
      }, 150);
    };

    const handleResize = () => {
      updateTargetPosition(false);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen, currentStepIndex, currentStep, updateTargetPosition]);

  // Phím tắt bàn phím (Esc = Đóng, Phím Mũi Tên = Tiến/Lùi)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleSkip();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStepIndex]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    if (tourKey) {
      try {
        localStorage.setItem(tourKey, "true");
      } catch {}
    }
    setCurrentStepIndex(0);
    if (onClose) onClose();
  };

  const handleComplete = () => {
    if (tourKey) {
      try {
        localStorage.setItem(tourKey, "true");
      } catch {}
    }
    setCurrentStepIndex(0);
    if (onClose) onClose();
  };

  if (!isOpen || !currentStep) return null;

  const isLastStep = currentStepIndex === steps.length - 1;
  const winW = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const winH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const isMobileOrNarrow = winW < 768 || winH < 720;

  // Tính toạ độ mũi tên trỏ vào phần tử highlight
  let arrowStyle = null;
  if (targetRect && tooltipPos.placement === "docked-bottom") {
    // Mũi tên nằm trên đỉnh Card trỏ thẳng LÊN mục tiêu
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const arrowX = Math.max(16, Math.min(targetCenterX - (tooltipPos.left || 12) - 6, 290));
    arrowStyle = {
      position: "absolute",
      top: "-6px",
      left: `${arrowX}px`,
      width: "12px",
      height: "12px",
      transform: "rotate(45deg)",
      backgroundColor: "#17181f",
      borderLeft: "2px solid #f59e0b",
      borderTop: "2px solid #f59e0b",
      boxShadow: "-2px -2px 6px rgba(0,0,0,0.4)",
      zIndex: 2,
    };
  } else if (targetRect && tooltipPos.placement === "docked-top") {
    // Mũi tên nằm dưới đáy Card trỏ thẳng XUỐNG mục tiêu
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const arrowX = Math.max(16, Math.min(targetCenterX - (tooltipPos.left || 12) - 6, 290));
    arrowStyle = {
      position: "absolute",
      bottom: "-6px",
      left: `${arrowX}px`,
      width: "12px",
      height: "12px",
      transform: "rotate(45deg)",
      backgroundColor: "#17181f",
      borderRight: "2px solid #f59e0b",
      borderBottom: "2px solid #f59e0b",
      boxShadow: "2px 2px 6px rgba(0,0,0,0.4)",
      zIndex: 2,
    };
  } else if (targetRect && tooltipPos.placement === "right") {
    arrowStyle = {
      position: "absolute",
      left: "-7px",
      top: "24px",
      width: "12px",
      height: "12px",
      transform: "rotate(45deg)",
      backgroundColor: "#17181f",
      borderLeft: "2px solid #f59e0b",
      borderBottom: "2px solid #f59e0b",
      boxShadow: "-3px 3px 6px rgba(0,0,0,0.4)",
      zIndex: 2,
    };
  } else if (targetRect && tooltipPos.placement === "left") {
    arrowStyle = {
      position: "absolute",
      right: "-7px",
      top: "24px",
      width: "12px",
      height: "12px",
      transform: "rotate(45deg)",
      backgroundColor: "#17181f",
      borderRight: "2px solid #f59e0b",
      borderTop: "2px solid #f59e0b",
      boxShadow: "3px -3px 6px rgba(0,0,0,0.4)",
      zIndex: 2,
    };
  }

  // Card Style bám sát chủ thể gọn gàng
  const cardStyle = {
    position: "fixed",
    top: tooltipPos.top,
    left: tooltipPos.left,
    width: isMobileOrNarrow ? "calc(100vw - 24px)" : "315px",
    maxWidth: "420px",
    backgroundColor: "#17181f",
    border: "1px solid #42475a",
    borderRadius: "10px",
    boxShadow: "0 16px 40px rgba(0,0,0,0.92), 0 0 24px rgba(245,158,11,0.25)",
    padding: "10px 13px",
    color: "#e6e8ec",
    zIndex: 999999,
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    boxSizing: "border-box",
    maxHeight: "calc(50vh - 10px)",
    animation: "tourFadeIn 0.18s ease-out",
  };

  return (
    <div
      className="onboarding-tour-root"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        pointerEvents: "auto",
      }}
    >
      {/* 1. Backdrop với hiệu ứng Spotlight Cutout */}
      {targetRect ? (
        <div
          style={{
            position: "fixed",
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            borderRadius: "12px",
            boxShadow:
              "0 0 0 9999px rgba(0, 0, 0, 0.78), 0 0 24px 6px rgba(245, 158, 11, 0.65), inset 0 0 12px rgba(245, 158, 11, 0.4)",
            border: "2px solid #f59e0b",
            pointerEvents: "none",
            transition: isScrollingRef.current ? "none" : "all 0.18s ease-out",
            zIndex: 999998,
          }}
        />
      ) : (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.78)",
            zIndex: 999998,
          }}
        />
      )}

      {/* 2. Tooltip Card nổi bật đặt neo an toàn, KHÔNG che phần tử */}
      <div key={currentStepIndex} ref={tooltipRef} style={cardStyle}>
        {/* Mũi tên chỉ thị trực quan */}
        {arrowStyle && <div style={arrowStyle} />}

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "8px",
            position: "relative",
            zIndex: 3,
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "1px 6px",
                  borderRadius: "12px",
                  fontSize: "9.5px",
                  fontWeight: 800,
                  background: "rgba(245, 158, 11, 0.18)",
                  color: "#f59e0b",
                  border: "1px solid rgba(245, 158, 11, 0.35)",
                }}
              >
                {currentStep.badge || `Bước ${currentStepIndex + 1} / ${steps.length}`}
              </span>
            </div>
            <h4
              style={{
                margin: 0,
                fontSize: "12.5px",
                fontWeight: 800,
                color: "#ffffff",
                letterSpacing: "0.2px",
                lineHeight: 1.3,
              }}
            >
              {currentStep.title}
            </h4>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            title="Đóng / Bỏ qua hướng dẫn (Esc)"
            style={{
              background: "transparent",
              border: "none",
              color: "#8a90a2",
              cursor: "pointer",
              fontSize: "16px",
              lineHeight: 1,
              padding: "4px",
              borderRadius: "4px",
              transition: "color 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#ff5555")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#8a90a2")}
          >
            ✕
          </button>
        </div>

        {/* Nội dung diễn giải (có thanh cuộn nội bộ khi chữ dài) */}
        <div
          style={{
            fontSize: "10.5px",
            lineHeight: 1.4,
            color: "#c9cedd",
            whiteSpace: "pre-line",
            wordBreak: "break-word",
            overflowWrap: "break-word",
            WebkitFontSmoothing: "antialiased",
            position: "relative",
            zIndex: 3,
            maxHeight: "140px",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            paddingRight: "4px",
          }}
        >
          {currentStep.content}
        </div>

        {/* Mẹo hành động thực tế */}
        {currentStep.actionHint && (
          <div
            style={{
              backgroundColor: "rgba(245, 158, 11, 0.08)",
              borderLeft: "3px solid #f59e0b",
              borderRadius: "0 6px 6px 0",
              padding: "4px 7px",
              fontSize: "10px",
              color: "#fbbf24",
              lineHeight: 1.4,
              position: "relative",
              zIndex: 3,
              flexShrink: 0,
            }}
          >
            {currentStep.actionHint}
          </div>
        )}

        {/* Footer điều hướng (Cố định ở đáy card, không bao giờ bị che) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "2px",
            paddingTop: "8px",
            borderTop: "1px solid #282b37",
            position: "relative",
            zIndex: 3,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={handleSkip}
            style={{
              background: "transparent",
              border: "none",
              color: "#7e8499",
              fontSize: "11.5px",
              cursor: "pointer",
              padding: "4px 2px",
              transition: "color 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#e0e0e0")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#7e8499")}
          >
            {t("tour_skip", "Bỏ qua")}
          </button>

          <div style={{ display: "flex", gap: "8px" }}>
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                style={{
                  background: "#242735",
                  border: "1px solid #3c4155",
                  color: "#d0d4e4",
                  fontSize: "11.5px",
                  fontWeight: 600,
                  padding: "5px 11px",
                  borderRadius: "5px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2f3346")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#242735")}
              >
                {t("tour_prev", "◀ Trước")}
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              style={{
                background: isLastStep
                  ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                  : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                border: "none",
                color: "#ffffff",
                fontSize: "11.5px",
                fontWeight: 700,
                padding: "5px 13px",
                borderRadius: "5px",
                cursor: "pointer",
                boxShadow: isLastStep
                  ? "0 2px 8px rgba(16, 185, 129, 0.4)"
                  : "0 2px 8px rgba(245, 158, 11, 0.4)",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              {isLastStep ? t("tour_finish", "Hoàn tất 🎉") : t("tour_next", "Tiếp theo ▶")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
