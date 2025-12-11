import React, { useEffect, useRef, useState } from 'react';

interface TrackingCatProps {
  isPasswordFocused: boolean;
}

export const TrackingCat: React.FC<TrackingCatProps> = ({ isPasswordFocused }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const leftEyeRef = useRef<SVGCircleElement>(null);
  const rightEyeRef = useRef<SVGCircleElement>(null);
  
  // Hand animation state (CSS classes are cleaner for simple transitions)
  const handClass = isPasswordFocused 
    ? "translate-y-0 duration-300 ease-out" 
    : "translate-y-24 duration-300 ease-in";

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // If password is focused, stop tracking (eyes are covered anyway)
      if (isPasswordFocused) return;

      if (!leftEyeRef.current || !rightEyeRef.current || !svgRef.current) return;

      const rekt = svgRef.current.getBoundingClientRect();
      
      // Calculate centers of eyes relative to viewport
      // These coordinates are approximations based on the SVG viewBox logic
      const anchorX = rekt.left + rekt.width / 2;
      const anchorY = rekt.top + rekt.height / 3;

      const mouseX = e.clientX;
      const mouseY = e.clientY;

      const angle = Math.atan2(mouseY - anchorY, mouseX - anchorX);
      
      // Distance constraint to keep pupil inside sclera
      const distance = Math.min(10, Math.hypot(mouseX - anchorX, mouseY - anchorY) / 5);

      const pupilX = Math.cos(angle) * distance;
      const pupilY = Math.sin(angle) * distance;

      leftEyeRef.current.style.transform = `translate(${pupilX}px, ${pupilY}px)`;
      rightEyeRef.current.style.transform = `translate(${pupilX}px, ${pupilY}px)`;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isPasswordFocused]);

  // Reset eyes to center when password focused
  useEffect(() => {
    if (isPasswordFocused && leftEyeRef.current && rightEyeRef.current) {
        leftEyeRef.current.style.transform = `translate(0px, 0px)`;
        rightEyeRef.current.style.transform = `translate(0px, 0px)`;
    }
  }, [isPasswordFocused]);

  return (
    <div className="w-40 h-32 relative overflow-hidden mx-auto -mb-4 z-10">
      <svg
        ref={svgRef}
        viewBox="0 0 200 160"
        className="w-full h-full"
      >
        <defs>
          <clipPath id="face-clip">
             <rect x="0" y="0" width="200" height="160" />
          </clipPath>
        </defs>

        {/* Ears */}
        <path d="M40 140 L20 40 L80 60 Z" fill="#374151" />
        <path d="M160 140 L180 40 L120 60 Z" fill="#374151" />
        
        {/* Inner Ears */}
        <path d="M45 120 L30 55 L70 70 Z" fill="#FCA5A5" />
        <path d="M155 120 L170 55 L130 70 Z" fill="#FCA5A5" />

        {/* Head */}
        <path d="M40 160 L40 80 Q100 20 160 80 L160 160 Z" fill="#4B5563" />

        {/* Eyes Background (Whites) */}
        <ellipse cx="75" cy="95" rx="20" ry="18" fill="white" />
        <ellipse cx="125" cy="95" rx="20" ry="18" fill="white" />

        {/* Pupils */}
        <circle ref={leftEyeRef} cx="75" cy="95" r="8" fill="#111827" />
        <circle ref={rightEyeRef} cx="125" cy="95" r="8" fill="#111827" />

        {/* Nose */}
        <path d="M92 115 L108 115 L100 125 Z" fill="#FCA5A5" />

        {/* Mouth */}
        <path d="M100 125 Q90 135 80 125" fill="none" stroke="white" strokeWidth="2" />
        <path d="M100 125 Q110 135 120 125" fill="none" stroke="white" strokeWidth="2" />

        {/* Hands (Initially hidden below, animated via CSS transform) */}
        <g className={`transition-transform ${handClass}`}>
            {/* Left Hand */}
            <path 
                d="M40 160 C 40 120, 60 80, 90 95 C 100 100, 90 120, 40 160" 
                fill="#374151" 
                stroke="#1F2937"
                strokeWidth="2"
            />
            {/* Right Hand */}
            <path 
                d="M160 160 C 160 120, 140 80, 110 95 C 100 100, 110 120, 160 160" 
                fill="#374151" 
                stroke="#1F2937"
                strokeWidth="2"
            />
        </g>
      </svg>
    </div>
  );
};