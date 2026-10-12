import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "../../i18n";

export default function OnboardingTour({
  isOpen = false,
  onClose,
  steps = [],
  initialStep = 0,
  tourKey = "autotrader_tour_completed_v1",
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(initialStep);
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 100, left: 100, placement: "right" });
  const tooltipRef = useRef(null);
  const { t } = useTranslation();

  // Đồng bộ bước khởi đầu khi mở tour
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(initialStep);
    }
  }, [isOpen, initialStep]);

  const currentStep = steps[currentStepIndex] || null;

  // Tính toán vị trí phần tử mục tiêu và đặt tooltip cạnh bên, bên trên hoặc bên dưới - TUYỆT ĐỐI KHÔNG ĐÈ LÊN
  const updateTargetPosition = useCallback(() => {
    if (!isOpen || !currentStep) return;

    let el = null;
    if (typeof currentStep.target === "string") {
      el = document.querySelector(currentStep.target);
    } else if (currentStep.target && currentStep.target.current) {
      el = currentStep.target.current;
    }

    if (el) {
      // Cuộn phần tử vào gần giữa màn hình để có tối đa không gian phía trên/dưới/hai bên
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

      const rect = el.getBoundingClientRect();
      const padding = currentStep.padding !== undefined ? currentStep.padding : 6;

      let top = rect.top;
      let left = rect.left;
      let right = rect.right;
      let bottom = rect.bottom;

      // Xử lý các tiêu đề dạng QGroupBox / .settings-group-title nhô lên ngoài khung viền trên
      const titleEl = el.querySelector && el.querySelector(".settings-group-title");
      if (titleEl) {
        const titleRect = titleEl.getBoundingClientRect();
        if (titleRect.top < top) {
          top = titleRect.top;
        }
        if (titleRect.left < left) {
          left = titleRect.left;
        }
        if (titleRect.right > right) {
          right = titleRect.right;
        }
        if (titleRect.bottom > bottom) {
          bottom = titleRect.bottom;
        }
      }

      // Nếu có tiêu đề nhô lên, tăng padding phía trên thêm 6px (tổng 12px) để viền vàng ôm trọn đẹp mắt không sát chữ
      const padTop = currentStep.paddingTop !== undefined ? currentStep.paddingTop : (titleEl ? padding + 6 : padding);
      const padBottom = currentStep.paddingBottom !== undefined ? currentStep.paddingBottom : padding;
      const padLeft = currentStep.paddingLeft !== undefined ? currentStep.paddingLeft : padding;
      const padRight = currentStep.paddingRight !== undefined ? currentStep.paddingRight : padding;

      const computedTop = Math.max(0, top - padTop);
      const computedLeft = Math.max(0, left - padLeft);
      const computedRight = right + padRight;
      const computedBottom = bottom + padBottom;

      const computedRect = {
        top: computedTop,
        left: computedLeft,
        right: computedRight,
        bottom: computedBottom,
        width: computedRight - computedLeft,
        height: computedBottom - computedTop,
      };

      setTargetRect(computedRect);

      // Lấy kích thước thực tế của card tooltip (nếu đã render), fallback 350x250
      const cardWidth = tooltipRef.current && tooltipRef.current.offsetWidth > 0 
        ? tooltipRef.current.offsetWidth 
        : 350;
      const cardHeight = tooltipRef.current && tooltipRef.current.offsetHeight > 0 
        ? tooltipRef.current.offsetHeight 
        : 250;

      const gap = 14;
      const margin = 12;
      const winW = window.innerWidth;
      const winH = window.innerHeight;

      // Tính khoảng trống khả dụng ở 4 hướng xung quanh phần tử mục tiêu
      const spaceTop = computedRect.top;
      const spaceBottom = winH - computedRect.bottom;
      const spaceLeft = computedRect.left;
      const spaceRight = winW - computedRect.right;

      // Hàm kiểm tra xem hộp tooltip có bị đè/cấn vào phần tử mục tiêu không
      const isOverlapping = (pos) => {
        const cRight = pos.left + cardWidth;
        const cBottom = pos.top + cardHeight;
        return !(
          cRight <= computedRect.left ||
          pos.left >= computedRect.right ||
          cBottom <= computedRect.top ||
          pos.top >= computedRect.bottom
        );
      };

      // Hàm tính toạ độ chính xác cho từng hướng
      const getCoordsForSide = (side) => {
        let t = 0;
        let l = 0;

        if (side === "right") {
          l = computedRect.right + gap;
          t = computedRect.top + (computedRect.height - cardHeight) / 2;
          t = Math.max(margin, Math.min(t, winH - cardHeight - margin));
        } else if (side === "left") {
          l = computedRect.left - cardWidth - gap;
          t = computedRect.top + (computedRect.height - cardHeight) / 2;
          t = Math.max(margin, Math.min(t, winH - cardHeight - margin));
        } else if (side === "top") {
          t = computedRect.top - cardHeight - gap;
          l = computedRect.left + (computedRect.width - cardWidth) / 2;
          l = Math.max(margin, Math.min(l, winW - cardWidth - margin));
        } else {
          // bottom
          t = computedRect.bottom + gap;
          l = computedRect.left + (computedRect.width - cardWidth) / 2;
          l = Math.max(margin, Math.min(l, winW - cardWidth - margin));
        }

        return { top: t, left: l };
      };

      const preferred = currentStep.placement || "right";

      // Danh sách thứ tự ưu tiên thử nghiệm hướng
      let order = [];
      if (preferred === "right") {
        order = ["right", "top", "bottom", "left"];
      } else if (preferred === "left") {
        order = ["left", "top", "bottom", "right"];
      } else if (preferred === "top") {
        order = ["top", "bottom", "right", "left"];
      } else {
        order = ["bottom", "top", "right", "left"];
      }

      let chosenSide = null;
      let chosenCoords = null;

      // Tìm hướng đầu tiên vừa vặn, nằm trong viewport và TUYỆT ĐỐI không đè lên mục tiêu
      for (const side of order) {
        const coords = getCoordsForSide(side);
        // Kiểm tra toạ độ có nằm trọn trong viewport không
        const inViewport = 
          coords.left >= margin && 
          coords.left + cardWidth <= winW - margin &&
          coords.top >= margin && 
          coords.top + cardHeight <= winH - margin;

        if (inViewport && !isOverlapping(coords)) {
          chosenSide = side;
          chosenCoords = coords;
          break;
        }
      }

      // Nếu không hướng nào hoàn toàn nằm trọn vẹn trong viewport mà không chạm:
      // Chọn hướng có khoảng trống lớn nhất giữa top và bottom hoặc left/right
      if (!chosenSide) {
        const spaces = [
          { side: "top", space: spaceTop },
          { side: "bottom", space: spaceBottom },
          { side: "right", space: spaceRight },
          { side: "left", space: spaceLeft },
        ];
        spaces.sort((a, b) => b.space - a.space);
        chosenSide = spaces[0].side;

        if (chosenSide === "top") {
          chosenCoords = {
            top: Math.max(margin, computedRect.top - cardHeight - gap),
            left: Math.max(margin, Math.min(computedRect.left + (computedRect.width - cardWidth) / 2, winW - cardWidth - margin)),
          };
        } else if (chosenSide === "bottom") {
          chosenCoords = {
            top: Math.min(winH - cardHeight - margin, computedRect.bottom + gap),
            left: Math.max(margin, Math.min(computedRect.left + (computedRect.width - cardWidth) / 2, winW - cardWidth - margin)),
          };
        } else if (chosenSide === "right") {
          chosenCoords = {
            left: Math.min(winW - cardWidth - margin, computedRect.right + gap),
            top: Math.max(margin, Math.min(computedRect.top, winH - cardHeight - margin)),
          };
        } else {
          chosenCoords = {
            left: Math.max(margin, computedRect.left - cardWidth - gap),
            top: Math.max(margin, Math.min(computedRect.top, winH - cardHeight - margin)),
          };
        }
      }

      setTooltipPos({ top: chosenCoords.top, left: chosenCoords.left, placement: chosenSide });
    } else {
      // Fallback khi không tìm thấy target: căn giữa màn hình
      setTargetRect(null);
      setTooltipPos({
        top: Math.max(40, (window.innerHeight - 250) / 2),
        left: Math.max(20, (window.innerWidth - 350) / 2),
        placement: "center",
      });
    }
  }, [isOpen, currentStep]);

  // Lắng nghe resize và scroll để update vị trí tức thời
  useEffect(() => {
    if (!isOpen) return;

    if (currentStep && typeof currentStep.preStep === "function") {
      try {
        currentStep.preStep();
      } catch (err) {
        console.error("[Tour] PreStep error:", err);
      }
    }

    // Chạy 4 nhịp để đảm bảo DOM render và đo chính xác cả khi chuyển tab/mở modal
    const timer1 = setTimeout(updateTargetPosition, 40);
    const timer2 = setTimeout(updateTargetPosition, 180);
    const timer3 = setTimeout(updateTargetPosition, 380);
    const timer4 = setTimeout(updateTargetPosition, 580);

    const handleWindowChange = () => {
      updateTargetPosition();
    };

    window.addEventListener("resize", handleWindowChange);
    window.addEventListener("scroll", handleWindowChange, true);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange, true);
    };
  }, [isOpen, currentStepIndex, updateTargetPosition, currentStep]);

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

  // Tính toạ độ mũi tên trỏ vào phần tử highlight
  const currentCardW = (tooltipRef.current && tooltipRef.current.offsetWidth > 0) ? tooltipRef.current.offsetWidth : 350;
  const currentCardH = (tooltipRef.current && tooltipRef.current.offsetHeight > 0) ? tooltipRef.current.offsetHeight : 250;

  let arrowStyle = null;
  if (targetRect && tooltipPos.placement === "right") {
    const arrowTop = Math.max(16, Math.min(targetRect.top + targetRect.height / 2 - tooltipPos.top - 6, currentCardH - 24));
    arrowStyle = {
      position: "absolute",
      left: "-7px",
      top: `${arrowTop}px`,
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
    const arrowTop = Math.max(16, Math.min(targetRect.top + targetRect.height / 2 - tooltipPos.top - 6, currentCardH - 24));
    arrowStyle = {
      position: "absolute",
      right: "-7px",
      top: `${arrowTop}px`,
      width: "12px",
      height: "12px",
      transform: "rotate(45deg)",
      backgroundColor: "#17181f",
      borderRight: "2px solid #f59e0b",
      borderTop: "2px solid #f59e0b",
      boxShadow: "3px -3px 6px rgba(0,0,0,0.4)",
      zIndex: 2,
    };
  } else if (targetRect && tooltipPos.placement === "bottom") {
    const arrowLeft = Math.max(20, Math.min(targetRect.left + targetRect.width / 2 - tooltipPos.left - 6, currentCardW - 24));
    arrowStyle = {
      position: "absolute",
      top: "-7px",
      left: `${arrowLeft}px`,
      width: "12px",
      height: "12px",
      transform: "rotate(45deg)",
      backgroundColor: "#17181f",
      borderLeft: "2px solid #f59e0b",
      borderTop: "2px solid #f59e0b",
      boxShadow: "-2px -2px 6px rgba(0,0,0,0.4)",
      zIndex: 2,
    };
  } else if (targetRect && tooltipPos.placement === "top") {
    const arrowLeft = Math.max(20, Math.min(targetRect.left + targetRect.width / 2 - tooltipPos.left - 6, currentCardW - 24));
    arrowStyle = {
      position: "absolute",
      bottom: "-7px",
      left: `${arrowLeft}px`,
      width: "12px",
      height: "12px",
      transform: "rotate(45deg)",
      backgroundColor: "#17181f",
      borderRight: "2px solid #f59e0b",
      borderBottom: "2px solid #f59e0b",
      boxShadow: "2px 2px 6px rgba(0,0,0,0.4)",
      zIndex: 2,
    };
  }

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
            borderRadius: "8px",
            boxShadow:
              "0 0 0 9999px rgba(0, 0, 0, 0.78), 0 0 24px 6px rgba(245, 158, 11, 0.65), inset 0 0 12px rgba(245, 158, 11, 0.4)",
            border: "2px solid #f59e0b",
            pointerEvents: "none",
            transition: "all 0.24s cubic-bezier(0.2, 0.8, 0.2, 1)",
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

      {/* 2. Tooltip Card nổi bật đặt cạnh bên, không đè lên mục hướng dẫn */}
      <div
        ref={tooltipRef}
        style={{
          position: "fixed",
          top: tooltipPos.top,
          left: tooltipPos.left,
          width: "360px",
          maxWidth: "calc(100vw - 32px)",
          backgroundColor: "#17181f",
          border: "1px solid #42475a",
          borderRadius: "10px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.9), 0 0 30px rgba(245,158,11,0.25)",
          padding: "16px 18px",
          color: "#e6e8ec",
          zIndex: 999999,
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          transition: "top 0.22s ease, left 0.22s ease",
          animation: "tourFadeIn 0.2s ease-out",
        }}
      >
        {/* Mũi tên chỉ thị trực quan */}
        {arrowStyle && <div style={arrowStyle} />}

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px", position: "relative", zIndex: 3 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontSize: "10.5px",
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
                fontSize: "14.5px",
                fontWeight: 800,
                color: "#ffffff",
                letterSpacing: "0.2px",
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

        {/* Nội dung diễn giải */}
        <div
          style={{
            fontSize: "12.5px",
            lineHeight: 1.55,
            color: "#c9cedd",
            whiteSpace: "pre-line",
            position: "relative",
            zIndex: 3,
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
              padding: "7px 10px",
              fontSize: "11.5px",
              color: "#fbbf24",
              lineHeight: 1.45,
              position: "relative",
              zIndex: 3,
            }}
          >
            {currentStep.actionHint}
          </div>
        )}

        {/* Footer điều hướng */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "4px",
            paddingTop: "10px",
            borderTop: "1px solid #282b37",
            position: "relative",
            zIndex: 3,
          }}
        >
          <button
            type="button"
            onClick={handleSkip}
            style={{
              background: "transparent",
              border: "none",
              color: "#7e8499",
              fontSize: "12px",
              cursor: "pointer",
              padding: "5px 4px",
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
                  fontSize: "12px",
                  fontWeight: 600,
                  padding: "5px 12px",
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
                fontSize: "12px",
                fontWeight: 700,
                padding: "6px 14px",
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
