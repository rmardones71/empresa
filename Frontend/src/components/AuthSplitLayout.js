import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CCol, CContainer, CRow } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilChevronLeft, cilChevronRight, cilMediaPause, cilMediaPlay } from '@coreui/icons'
import ucmLogo from 'src/assets/images/brand/logo-ucm.png'
import slideCare from 'src/assets/images/login/ucm-slide-1.jpg'
import slideVir from 'src/assets/images/login/ucm-slide-2.jpg'
import slideFleet from 'src/assets/images/login/ucm-slide-3.jpg'

const loginSlides = [
  { src: slideCare, alt: 'Atención médica UCM en ambulancia' },
  { src: slideVir, alt: 'Vehículo de intervención rápida UCM' },
  { src: slideFleet, alt: 'Flota de ambulancias UCM' },
]

const floatingDots = [
  { left: '10%', top: '18%', size: 4, delay: '0s', duration: '6.8s' },
  { left: '18%', top: '72%', size: 3, delay: '0.7s', duration: '7.6s' },
  { left: '27%', top: '34%', size: 5, delay: '1.1s', duration: '7.1s' },
  { left: '36%', top: '86%', size: 3, delay: '0.3s', duration: '8.2s' },
  { left: '47%', top: '16%', size: 4, delay: '1.6s', duration: '7.8s' },
  { left: '58%', top: '62%', size: 5, delay: '0.9s', duration: '6.6s' },
  { left: '69%', top: '28%', size: 3, delay: '1.9s', duration: '8.4s' },
  { left: '78%', top: '78%', size: 4, delay: '0.5s', duration: '7.2s' },
  { left: '88%', top: '45%', size: 5, delay: '1.4s', duration: '8s' },
  { left: '93%', top: '13%', size: 3, delay: '1s', duration: '7.4s' },
]

const AuthSplitLayout = ({ children, showHomeLink = true }) => {
  const [activeSlide, setActiveSlide] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return undefined

    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % loginSlides.length)
    }, 4200)

    return () => window.clearInterval(timer)
  }, [paused])

  const goToPreviousSlide = () => {
    setActiveSlide((current) => (current === 0 ? loginSlides.length - 1 : current - 1))
  }

  const goToNextSlide = () => {
    setActiveSlide((current) => (current + 1) % loginSlides.length)
  }

  return (
    <div
      className="min-vh-100 d-flex"
      style={{
        background:
          'linear-gradient(135deg, rgba(8, 33, 62, 0.1) 0%, rgba(8, 33, 62, 0.65) 100%), linear-gradient(160deg, #175b94 0%, #8fc1e8 43%, #183a63 100%)',
      }}
    >
      <style>
        {`
          @keyframes ucmFloatDot {
            0%, 100% {
              opacity: 0.25;
              transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
            }
            25% {
              opacity: 0.78;
              transform: translate3d(24px, -18px, 0) rotate(90deg) scale(1.28);
            }
            50% {
              opacity: 0.95;
              transform: translate3d(2px, -34px, 0) rotate(180deg) scale(1.48);
            }
            75% {
              opacity: 0.62;
              transform: translate3d(-24px, -16px, 0) rotate(270deg) scale(1.08);
            }
          }
        `}
      </style>
      <CContainer fluid className="p-0">
        <CRow className="g-0 min-vh-100">
          <CCol lg={5} className="d-flex align-items-center">
            <div
              className="w-100 bg-white"
              style={{
                minHeight: '100vh',
                borderTopRightRadius: 34,
                borderBottomRightRadius: 34,
                boxShadow: '22px 0 54px rgba(4, 19, 41, 0.2)',
                position: 'relative',
                zIndex: 2,
              }}
            >
              <div
                className="mx-auto d-flex flex-column justify-content-center h-100 px-4 py-5"
                style={{ maxWidth: 430 }}
              >
                {showHomeLink && (
                  <Link
                    to="/"
                    className="text-decoration-none text-uppercase mb-5"
                    style={{ color: '#49627f', fontSize: 12, fontWeight: 700, letterSpacing: 1.1 }}
                  >
                    ‹ Ir al inicio
                  </Link>
                )}

                <img
                  src={ucmLogo}
                  alt="UCM - Unidad Coronaria Móvil"
                  className="mb-5"
                  style={{ width: '100%', maxWidth: 340, height: 'auto' }}
                />

                {children}
              </div>
            </div>
          </CCol>

          <CCol lg={7} className="d-none d-lg-flex align-items-center justify-content-center position-relative overflow-hidden">
            <div
              className="position-absolute top-0 start-0 w-100 h-100"
              style={{
                background:
                  'linear-gradient(135deg, rgba(8, 33, 62, 0.1) 0%, rgba(8, 33, 62, 0.65) 100%), linear-gradient(160deg, #175b94 0%, #8fc1e8 43%, #183a63 100%)',
              }}
            />
            <div
              className="position-absolute top-0 start-0 w-100 h-100"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 22% 24%, rgba(125, 211, 252, 0.34) 0 1px, transparent 2px), radial-gradient(circle at 72% 34%, rgba(255, 255, 255, 0.28) 0 1px, transparent 2px), radial-gradient(circle at 48% 78%, rgba(186, 230, 253, 0.26) 0 1px, transparent 2px)',
                backgroundSize: '92px 92px, 136px 136px, 168px 168px',
                opacity: 0.55,
              }}
            />
            {floatingDots.map((dot, index) => (
              <span
                key={index}
                className="position-absolute rounded-circle"
                style={{
                  left: dot.left,
                  top: dot.top,
                  width: dot.size,
                  height: dot.size,
                  background: 'rgba(224, 247, 255, 0.92)',
                  boxShadow: '0 0 16px rgba(125, 211, 252, 0.85)',
                  animation: `ucmFloatDot ${dot.duration} ease-in-out ${dot.delay} infinite`,
                  pointerEvents: 'none',
                }}
              />
            ))}

            <div
              className="position-relative"
              style={{
                width: 390,
                borderRadius: 26,
                color: '#ffffff',
                background: 'linear-gradient(180deg, rgba(35, 45, 61, 0.94) 0%, rgba(17, 18, 22, 0.98) 100%)',
                boxShadow: '0 28px 70px rgba(0, 0, 0, 0.42)',
                backdropFilter: 'blur(12px)',
                padding: 18,
              }}
            >
              <div
                className="position-relative overflow-hidden mb-4"
                style={{
                  height: 215,
                  borderRadius: 18,
                  background: '#07111f',
                }}
              >
                {loginSlides.map((slide, index) => (
                  <img
                    key={slide.src}
                    src={slide.src}
                    alt={slide.alt}
                    className="position-absolute top-0 start-0 w-100 h-100"
                    style={{
                      objectFit: 'cover',
                      opacity: activeSlide === index ? 1 : 0,
                      transform: activeSlide === index ? 'scale(1)' : 'scale(1.035)',
                      transition: 'opacity 900ms ease, transform 4200ms ease',
                    }}
                  />
                ))}
                <div
                  className="position-absolute top-0 start-0 w-100 h-100"
                  style={{
                    background: 'linear-gradient(180deg, rgba(5, 15, 30, 0) 0%, rgba(5, 15, 30, 0.18) 100%)',
                  }}
                />
              </div>

              <div className="mb-2" style={{ color: '#b9e4ff', fontSize: 13, fontWeight: 700 }}>
                Unidad Coronaria Móvil
              </div>
              <h2 className="mb-4" style={{ fontSize: 27, lineHeight: 1.25, fontWeight: 650 }}>
                Respuesta médica cuando cada minuto importa
              </h2>

              <div
                className="d-flex align-items-center justify-content-between"
                style={{
                  borderRadius: 12,
                  background: 'rgba(0, 0, 0, 0.44)',
                  padding: '14px 16px',
                }}
              >
                <div className="d-flex align-items-center gap-2">
                  {loginSlides.map((slide, index) => (
                    <button
                      key={slide.src}
                      type="button"
                      aria-label={`Ver imagen ${index + 1}`}
                      onClick={() => setActiveSlide(index)}
                      className="border-0 p-0"
                      style={{
                        width: activeSlide === index ? 30 : 26,
                        height: 4,
                        borderRadius: 999,
                        background: activeSlide === index ? '#22d3ee' : 'rgba(255,255,255,0.55)',
                        transition: 'all 240ms ease',
                      }}
                    />
                  ))}
                </div>

                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    aria-label="Imagen anterior"
                    onClick={goToPreviousSlide}
                    className="d-inline-flex align-items-center justify-content-center rounded-circle"
                    style={{
                      width: 34,
                      height: 34,
                      border: '2px solid rgba(255,255,255,0.9)',
                      background: 'rgba(255,255,255,0.04)',
                      color: '#ffffff',
                    }}
                  >
                    <CIcon icon={cilChevronLeft} />
                  </button>
                  <button
                    type="button"
                    aria-label="Imagen siguiente"
                    onClick={goToNextSlide}
                    className="d-inline-flex align-items-center justify-content-center rounded-circle"
                    style={{
                      width: 34,
                      height: 34,
                      border: '2px solid rgba(255,255,255,0.9)',
                      background: 'rgba(255,255,255,0.04)',
                      color: '#ffffff',
                    }}
                  >
                    <CIcon icon={cilChevronRight} />
                  </button>
                  <button
                    type="button"
                    aria-label={paused ? 'Reproducir carrusel' : 'Pausar carrusel'}
                    onClick={() => setPaused((current) => !current)}
                    className="d-inline-flex align-items-center justify-content-center border-0"
                    style={{
                      width: 32,
                      height: 34,
                      background: 'transparent',
                      color: '#ffffff',
                    }}
                  >
                    <CIcon icon={paused ? cilMediaPlay : cilMediaPause} />
                  </button>
                </div>
              </div>
            </div>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default AuthSplitLayout
