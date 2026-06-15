export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-black dark:text-white"
    >
      {/* Hexagon outer */}
      <path
        d="M20 2L34.64 10V30L20 38L5.36 30V10L20 2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Inner hexagon */}
      <path
        d="M20 8L31.12 14V26L20 32L8.88 26V14L20 8Z"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
        opacity="0.6"
      />
      {/* Center dot and lines */}
      <circle cx="20" cy="20" r="2" fill="currentColor" />
      <line x1="20" y1="14" x2="20" y2="8" stroke="currentColor" strokeWidth="1" />
      <line x1="20" y1="26" x2="20" y2="32" stroke="currentColor" strokeWidth="1" />
      <line x1="14" y1="17" x2="8.88" y2="14" stroke="currentColor" strokeWidth="1" />
      <line x1="26" y1="23" x2="31.12" y2="26" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}
