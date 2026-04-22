import { useState, useEffect, useCallback } from 'react';
import { jobQueue, Job, JobStatus } from '@/services/jobQueue';

export function useBackgroundJob(jobId?: string) {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!jobId) return;

    const foundJob = jobQueue.getJob(jobId);
    setJob(foundJob || null);

    // Poll for updates if job is processing
    if (foundJob && (foundJob.status === 'pending' || foundJob.status === 'processing')) {
      const interval = setInterval(() => {
        const updated = jobQueue.getJob(jobId);
        setJob(updated || null);

        if (updated && (updated.status === 'completed' || updated.status === 'failed')) {
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [jobId]);

  const createJob = useCallback(async <T,>(jobType: string, data: T): Promise<Job<T>> => {
    setLoading(true);
    try {
      const newJob = await jobQueue.addJob(jobType, data);
      setJob(newJob);
      return newJob;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    job,
    loading,
    createJob,
    isProcessing: job?.status === 'processing' || job?.status === 'pending',
    isCompleted: job?.status === 'completed',
    isFailed: job?.status === 'failed',
    progress: job?.progress || 0
  };
}

export function useJobList(jobType?: string) {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    const updateJobs = () => {
      const allJobs = jobType ? jobQueue.getJobsByType(jobType) : jobQueue.getAllJobs();
      setJobs(allJobs);
    };

    updateJobs();

    const interval = setInterval(updateJobs, 2000);
    return () => clearInterval(interval);
  }, [jobType]);

  return { jobs };
}
