import React, { useEffect, useRef } from 'react';

// Definimos los tipos de dirección posibles
export type WindDirection = 'left' | 'right' | 'none';

interface ChristmasSnowProps {
  particleCount?: number;
  zIndex?: number;
  // Nuevas props para el viento
  windSpeed?: number; // Sugerencia: entre 0 (calma) y 5 (tormenta)
  windDirection?: WindDirection;
}

const ChristmasSnow: React.FC<ChristmasSnowProps> = ({ 
  particleCount = 150, 
  zIndex = 9999,
  windSpeed = 1,    // Velocidad por defecto baja
  windDirection = 'none' // Sin dirección predominante por defecto
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- Refs para guardar el estado actual del viento ---
  // Usamos refs porque necesitamos que la clase Particle (dentro del useEffect principal)
  // acceda a los valores MÁS RECIENTES de las props sin tener que reinicializar
  // todo el canvas cada vez que el viento cambia.
  const windSpeedRef = useRef(windSpeed);
  const windDirectionRef = useRef(windDirection);

  // Sincronizamos los refs cuando las props cambian
  useEffect(() => {
    windSpeedRef.current = windSpeed;
    windDirectionRef.current = windDirection;
  }, [windSpeed, windDirection]);


  // --- Efecto Principal de Animación ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];

    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    class Particle {
      x: number = 0;
      y: number = 0;
      isIce: boolean = false;
      speedY: number = 0;
      speedX: number = 0;
      size: number = 0;
      opacity: number = 0;

      constructor() {
        this.reset(true);
      }

      reset(initial: boolean = false) {
        if (!canvas) return;

        this.x = Math.random() * canvas.width;
        this.y = initial ? Math.random() * canvas.height : -this.size - 10;
        
        this.isIce = Math.random() > 0.8;
        this.size = Math.random() * 3 + 1;
        this.opacity = Math.random() * 0.5 + 0.3;

        // --- FÍSICA DEL VIENTO ---
        // Leemos los valores actuales de los refs
        const currentWindSpeed = windSpeedRef.current;
        const currentDirection = windDirectionRef.current;

        // 1. Calcular velocidad vertical (Y)
        // El viento fuerte genera un poco de "sustentación", ralentizando la caída
        const verticalDrag = Math.max(0.5, 1 - (currentWindSpeed * 0.08)); 
        const baseSpeedY = this.isIce ? Math.random() * 3 + 2 : Math.random() * 1 + 0.5;
        this.speedY = baseSpeedY * verticalDrag;

        // 2. Calcular velocidad horizontal (X)
        // Deriva natural pequeña + Fuerza del viento
        const naturalDrift = (Math.random() - 0.5) * 0.5; 
        let windForceX = 0;
        
        // Añadimos un factor aleatorio al viento para que no todas las partículas se muevan igual
        const windRandomness = Math.random() * 0.5 + 0.7; 

        if (currentDirection === 'right') {
            windForceX = currentWindSpeed * windRandomness;
        } else if (currentDirection === 'left') {
            windForceX = -currentWindSpeed * windRandomness;
        }

        this.speedX = naturalDrift + windForceX;
      }

      update() {
        if (!canvas) return;
        
        this.y += this.speedY;
        this.x += this.speedX;

        // Verificar si salió de la pantalla por abajo O por los lados
        // Agregamos un margen (this.size * 2) para que no desaparezcan bruscamente
        const isOffScreenBottom = this.y > canvas.height + this.size;
        const isOffScreenRight = this.x > canvas.width + this.size * 2;
        const isOffScreenLeft = this.x < 0 - this.size * 2;

        if (isOffScreenBottom || isOffScreenRight || isOffScreenLeft) {
          this.reset();
          // Opcional: Si hay mucho viento lateral, al resetear, intentamos
          // poner la partícula "viento arriba" para que cruce la pantalla.
          if(windDirectionRef.current === 'right' && !isOffScreenBottom) {
             this.x = -this.size;
             this.y = Math.random() * canvas.height * 0.5; // Aparece en la mitad superior izquierda
          } else if (windDirectionRef.current === 'left' && !isOffScreenBottom) {
             this.x = canvas.width + this.size;
             this.y = Math.random() * canvas.height * 0.5; // Aparece en la mitad superior derecha
          }
        }
      }

      draw() {
        if (!ctx) return;
        // ... (El método draw permanece igual que la versión anterior)
        ctx.beginPath();
        if (this.isIce) {
          ctx.fillStyle = `rgba(200, 240, 255, ${this.opacity + 0.2})`;
          ctx.shadowBlur = 5;
          ctx.shadowColor = "white";
          ctx.rect(this.x, this.y, this.size * 0.8, this.size * 1.5); 
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
          ctx.shadowBlur = 0;
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        }
        ctx.fill();
      }
    }

    const init = () => {
      setCanvasSize();
      particles = [];
      // El arreglo se reinicia solo si cambia particleCount
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', setCanvasSize);
    init();
    animate();

    return () => {
      window.removeEventListener('resize', setCanvasSize);
      cancelAnimationFrame(animationFrameId);
    };
  // Solo reiniciamos todo si cambia la cantidad de partículas.
  // Los cambios de viento se manejan internamente vía refs.
  }, [particleCount]); 

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0, left: 0, width: '100%', height: '100%',
        pointerEvents: 'none',
        zIndex: zIndex,
      }}
    />
  );
};

export default ChristmasSnow;