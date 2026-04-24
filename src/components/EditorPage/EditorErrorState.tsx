interface EditorErrorStateProps {
  message: string;
  hideBackButton: boolean;
  onNavigateBack: () => void;
}

export function EditorErrorState({
  message,
  hideBackButton,
  onNavigateBack,
}: EditorErrorStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-4">
      <p className="text-sm font-body text-tertiary">{message}</p>
      {!hideBackButton && (
        <button
          onClick={onNavigateBack}
          className="text-sm font-label text-primary hover:text-primary/80 cursor-pointer"
        >
          Back to list
        </button>
      )}
    </div>
  );
}
