export const LoadingSpinner = (props: {
  size?: number;
  stroke?: string;
  strokeWidth?: number;
}) => {
  return (
    <div role="status">
      <svg
        aria-hidden="true"
        width={props.size ?? 40}
        height={props.size ?? 40}
        stroke={props.stroke ?? "#9D21E6"}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g>
          <circle
            cx="12"
            cy="12"
            r="9.5"
            fill="none"
            strokeWidth={props.strokeWidth ?? 3}
            strokeLinecap="round"
          >
            <animate
              attributeName="stroke-dasharray"
              dur="1.5s"
              calcMode="spline"
              values="0 150;42 150;42 150;42 150"
              keyTimes="0;0.475;0.95;1"
              keySplines="0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1"
              repeatCount="indefinite"
            />
            <animate
              attributeName="stroke-dashoffset"
              dur="1.5s"
              calcMode="spline"
              values="0;-16;-59;-59"
              keyTimes="0;0.475;0.95;1"
              keySplines="0.42,0,0.58,1;0.42,0,0.58,1;0.42,0,0.58,1"
              repeatCount="indefinite"
            />
          </circle>
          <animateTransform
            attributeName="transform"
            type="rotate"
            dur="2s"
            values="0 12 12;360 12 12"
            repeatCount="indefinite"
          />
        </g>
      </svg>
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export const LoadingPage = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
      <LoadingSpinner size={60} />
    </div>
  );
};
