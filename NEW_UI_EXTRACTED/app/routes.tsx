import { createBrowserRouter } from "react-router";
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import SubmitJob from "./pages/SubmitJob";
import Monitor from "./pages/Monitor";
import Results from "./pages/Results";
import Billing from "./pages/Billing";
import Contributor from "./pages/Contributor";
import Leaderboard from "./pages/Leaderboard";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
    errorElement: <ErrorBoundary />,
  },
  {
    path: "/dashboard",
    element: <Layout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: "submit-job",
        element: <SubmitJob />,
      },
      {
        path: "monitor",
        element: <Monitor />,
      },
      {
        path: "results",
        element: <Results />,
      },
      {
        path: "billing",
        element: <Billing />,
      },
      {
        path: "contributor",
        element: <Contributor />,
      },
      {
        path: "leaderboard",
        element: <Leaderboard />,
      },
    ],
  },
]);
