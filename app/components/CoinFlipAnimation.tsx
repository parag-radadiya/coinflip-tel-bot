import React from 'react';

// Define the structure for the last game result needed by this component
interface LastResultData {
  coinResult: 'heads' | 'tails';
  payout: number | null; // Amount won or lost (null if not applicable)
  // Add other relevant fields from GameResult if needed
}

// Define the props for the component
interface CoinFlipAnimationProps {
  animationClass: string; // CSS class for the animation state
  lastResult: LastResultData | null; // Result of the last flip
  status: 'IDLE' | 'BETTING' | 'FLIPPING' | 'SHOWING_RESULT' | 'ERROR'; // Current game status
  animationKey: number; // Key to force re-render/restart animation
}

const CoinFlipAnimation: React.FC<CoinFlipAnimationProps> = ({
  animationClass,
  lastResult,
  status,
  animationKey
}) => {
  // TODO: Implement logic for series display if needed
  const series = '-';
  // Use a placeholder or potentially derive from lastResult if available
  const multiplier = lastResult ? 'x1.9804' : 'x?.????'; // Example, adjust as needed

  // Determine the coin face based on the result (or default)
  // TODO: Replace with actual Heads/Tails icons/images later
  // Determine the coin face based on the result (or default) - Using text placeholders
  const coinFaceStyle = "text-4xl font-bold text-slate-100 drop-shadow-md";
  const coinFace = lastResult?.coinResult === 'heads'
    ? <span className={coinFaceStyle}>H</span> // Placeholder for Heads
    : lastResult?.coinResult === 'tails'
    ? <span className={coinFaceStyle}>T</span> // Placeholder for Tails
    : <span className="text-slate-100 text-4xl drop-shadow-md">★<span className="text-3xl relative -top-1 mx-[-2px]">★</span>★</span>; // Default stars

  const isSpinning = status === 'BETTING' || status === 'FLIPPING';

  return (
    <div className="flex flex-col justify-center items-center my-8"> {/* Changed to flex-col */}
      {/* Use a darker, slightly blue background like slate-800 and adjust padding */}
      <div className="bg-slate-800 rounded-full px-6 sm:px-8 py-3 flex items-center justify-between w-full max-w-lg relative shadow-inner min-h-[80px]">
        {/* Left Section: Series */}
        <div className="text-center w-1/3"> {/* Added width for balance */}
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Series</div>
          <div className="text-xl font-semibold text-slate-100">{series}</div>
        </div>

        {/* Center Section: Animated Coin */}
        <div key={animationKey} className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
          {/* Apply animation class here */}
          <div className={`w-24 h-24 bg-gradient-to-br from-slate-300 to-slate-400 rounded-full flex items-center justify-center border-4 border-slate-500 shadow-xl ring-2 ring-slate-600/50 ${animationClass}`}>
            {/* Display coin face - show only when not spinning fast */}
            {!isSpinning || animationClass.includes('flip') ? coinFace : null}
          </div>
        </div>

        {/* Right Section: Multiplier */}
        <div className="text-center w-1/3"> {/* Added width for balance */}
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Multiplier</div>
          <div className="text-xl font-semibold text-slate-100">{multiplier}</div>
        </div>
      </div>
      {/* Display Win/Loss Amount - Ensure lastResult is checked */}
      {status === 'SHOWING_RESULT' && lastResult && typeof lastResult.payout === 'number' && (
        <div className={`mt-4 text-2xl font-bold ${lastResult.payout >= 0 ? 'text-green-400' : 'text-red-500'}`}>
          {/* Display win/loss message based on payout */}
          {lastResult.payout >= 0
            ? `You Won: ${lastResult.payout.toFixed(2)}`
            : `You Lost: ${Math.abs(lastResult.payout).toFixed(2)}`}
        </div>
      )}
    </div>
  );
};

export default CoinFlipAnimation;