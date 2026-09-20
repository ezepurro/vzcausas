import { RouterProvider } from "react-router";
import { QueryProvider } from "./app/providers/QueryProvider";
import { ToastProvider } from "./app/providers/ToastProvider";
import { router } from "./app/router";


export function App() {
  return (
    <QueryProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryProvider>
  )
}
