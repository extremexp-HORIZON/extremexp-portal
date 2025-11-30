// Standalone component: no external dashboard classes
import { useState, useEffect, useCallback } from "react";
import useRequest from "../../hooks/useRequest";
import { message } from "../../utils/message";
import { useAccountStore } from "../../stores/accountStore";

interface QueueStatus {
  queue: {
    max_concurrent_experiments: number;
    queued_experiments: number;
    running_experiment_ids: string[];
    running_experiments: number;
  };
}

const Execution = () => {
  const { request } = useRequest();
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [experiments, setExperiments] = useState<
    Array<{
      id: string;
      name: string;
      status: string;
      workflow_ids: string[];
    }>
  >([]);
  const [availableExperiments, setAvailableExperiments] = useState<string[]>(
    []
  );
  const [selectedExperiment, setSelectedExperiment] = useState<string>("");

  const username = useAccountStore((state) => state.username);

  const fetchQueueStatus = useCallback(async () => {
    try {
      const res = await request({ url: "/exp/queue/status", method: "GET" });
      if (res) setQueueStatus(res as QueueStatus);
      setError(null);
    } catch (err) {
      setError("Failed to fetch queue status");
      message("Failed to fetch queue status");
      console.error("Error fetching queue status:", err);
    }
  }, [request]);

  useEffect(() => {
    fetchQueueStatus();

    const interval = setInterval(() => {
      fetchQueueStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchQueueStatus]);

  useEffect(() => {
    if (!username) return;
    fetchAvailableExperiments();
    setSelectedExperiment((prev) => {
      if (prev) return prev;
      if (availableExperiments.length > 0) return availableExperiments[0];
      return "";
    });
  }, []);

  const fetchExperiments = useCallback(async () => {
    try {
      const res = await request({
        url: "/exp/experiments/query",
        method: "POST",
        params: { username }, // allow backend that accepts either body or query
      });

      const items: Array<{
        id: string;
        name: string;
        status: string;
        workflow_ids: string[];
      }> = [];
      const data: any = res;
      if (data && Array.isArray(data.experiments)) {
        for (const entry of data.experiments) {
          const keys = Object.keys(entry || {});
          if (keys.length > 0) {
            const key = keys[0];
            const exp = entry[key];
            if (exp && exp.id) {
              items.push({
                id: exp.id,
                name: exp.name ?? "",
                status: exp.status ?? "",
                workflow_ids: Array.isArray(exp.workflow_ids)
                  ? exp.workflow_ids
                  : [],
              });
            }
          }
        }
      }
      setExperiments(items);
    } catch (err) {
      message("Failed to fetch experiments");
      console.error("Error fetching experiments:", err);
      setError("Failed to fetch experiments");
    }
  }, [request, username]);

  const fetchAvailableExperiments = useCallback(async () => {
    try {
      const res = await request({
        url: "/api/experiments/all",
      });
      const payload: any = res;
      const names: string[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data?.experiments)
        ? payload.data.experiments.map((e: any) => e?.name ?? "")
        : [];
      const filtered = names.filter(Boolean);
      setAvailableExperiments(filtered);
      if (filtered.length && !selectedExperiment)
        setSelectedExperiment(filtered[0]);
    } catch (err) {
      message("Failed to fetch saved experiments");
      console.error("Error fetching available experiments:", err);
    }
  }, [request, username, selectedExperiment]);

  useEffect(() => {
    if (!username) return;
    fetchExperiments();
    const interval = setInterval(() => {
      fetchExperiments();
    }, 5000);
    return () => clearInterval(interval);
  }, [username, fetchExperiments]);

  const handleRunSelected = async () => {
    if (!selectedExperiment) return;

    try {
      await request({
        url: '/exp/run',
        method: 'POST',
        data: {
          username: username,
          exp_name: selectedExperiment,
        },
      });

      message('Experiment started successfully');
      // Refresh the experiments list to show the new running experiment
      fetchExperiments();
    } catch (error) {
      console.error('Error running experiment:', error);
      message('Failed to run experiment');
    }
  };

  const handleVisualize = (experimentId: string) => {
    window.open(
      `https://vis.extremexp-icom.intracom-telecom.com/${experimentId}`,
      "_blank"
    );
  };

  return (
    <div className="w-full h-full bg-gray-50">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {error}
        </div>
      )}

      {queueStatus && (
        <div className="w-full h-full flex flex-col gap-3 p-3">
          {/* Queue Status Cards and Run Experiment Section */}
          <div className="flex items-start gap-3">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Max Concurrent</div>
                <div className="text-2xl font-semibold text-gray-900">
                  {queueStatus.queue.max_concurrent_experiments || 0}
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Running</div>
                <div className="text-2xl font-semibold text-blue-600">
                  {queueStatus.queue.running_experiments || 0}
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Queued</div>
                <div className="text-2xl font-semibold text-amber-600">
                  {queueStatus.queue.queued_experiments || 0}
                </div>
              </div>
            </div>

            {/* Run Experiment Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-2 shrink-0 py-4">
              <select
                className="px-1.5 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white"
                value={selectedExperiment}
                onMouseDown={fetchAvailableExperiments}
                onFocus={fetchAvailableExperiments}
                onChange={(e) => setSelectedExperiment(e.target.value)}
              >
                {availableExperiments.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <button
                className="px-2 py-0.5 rounded-md text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                onClick={handleRunSelected}
                disabled={!selectedExperiment}
              >
                Run
              </button>
            </div>
          </div>

          {/* Experiments Table */}
          <div className="flex-1 min-h-0 bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="h-full overflow-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">
                      ID
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">
                      Name
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">
                      Workflows
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-600">
                      Status
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-600">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {experiments.map((exp) => (
                    <tr
                      key={exp.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-3 py-2 font-mono text-left text-xs text-gray-600">
                        {exp.id}
                      </td>
                      <td className="px-3 py-2 text-xs text-left text-gray-900">
                        {exp.name}
                      </td>
                      <td className="px-3 py-2 text-xs text-left text-gray-600">
                        {exp.workflow_ids?.length ?? 0}
                      </td>
                      <td className="px-3 py-2 text-xs flex justify-center">
                        <div
                          className={`rounded-md text-xs font-bold border-2 w-32 ${
                            (exp.status || "").toLowerCase() === "completed"
                              ? "bg-green-200 text-green-700 border-green-700"
                              : (exp.status || "").toLowerCase() === "running"
                              ? "bg-blue-200 text-blue-700 border-blue-700"
                              : (exp.status || "").toLowerCase() === "queued"
                              ? "bg-amber-200 text-amber-700 border-amber-700"
                              : "bg-gray-200 text-gray-500 border-gray-500"
                          }`}
                        >
                          {exp.status}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          className="px-2.5 py-1 rounded text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                          disabled={
                            !["completed", "running"].includes(
                              (exp.status || "").toLowerCase()
                            )
                          }
                          onClick={() => handleVisualize(exp.id)}
                        >
                          Visualize
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Execution;
