import LoginForm from "./LoginForm";

function LoginModal({ onClose,setUser}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto bg-black/50 backdrop-blur-sm" 
        onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-[fadeIn_.2s_ease]"
      >
        <LoginForm  onClose={onClose} setUser={setUser}  />
      </div>
    </div>
  );
}
export default LoginModal;