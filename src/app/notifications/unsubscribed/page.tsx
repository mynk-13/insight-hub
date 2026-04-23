export default function UnsubscribedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-3 max-w-sm px-4">
        <h1 className="text-xl font-semibold">Unsubscribed</h1>
        <p className="text-sm text-muted-foreground">
          You have been unsubscribed from this email notification. You can re-enable it in your
          notification preferences at any time.
        </p>
      </div>
    </div>
  );
}
