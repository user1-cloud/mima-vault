import { useNavigate } from "react-router-dom";
import { flushSync } from "react-dom";

export function useNavigateWithTransition() {
  const navigate = useNavigate();
  return (to: string, options?: { replace?: boolean }) => {
    if ("startViewTransition" in document) {
      document.startViewTransition(() => {
        flushSync(() => {
          navigate(to, options);
        });
      });
    } else {
      navigate(to, options);
    }
  };
}
