import toast from 'react-hot-toast';

export const notify = {
    success: (msg: string) => toast.success(msg, { style: { borderRadius: '10px' } }),
    error: (msg: string) => toast.error(msg, { style: { borderRadius: '10px' } })
};
