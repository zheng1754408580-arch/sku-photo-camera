import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="mx-auto w-full max-w-sm text-center">
        {/* Logo */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50">
          <svg
            className="h-10 w-10 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
            />
          </svg>
        </div>

        <h1 className="mb-2 text-2xl font-bold tracking-tight">
          SKU 照片命名相机
        </h1>
        <p className="mb-10 text-sm text-gray-500">
          上传 SKU 文件，按编号自动命名拍摄的照片
        </p>

        <div className="space-y-3">
          <Link
            href="/login"
            className="block w-full rounded-xl bg-blue-500 px-4 py-3.5 text-center font-semibold text-white transition hover:bg-blue-600 active:scale-[0.98]"
          >
            登录
          </Link>
          <Link
            href="/register"
            className="block w-full rounded-xl border border-blue-500 px-4 py-3.5 text-center font-semibold text-blue-500 transition hover:bg-blue-50 active:scale-[0.98]"
          >
            申请使用
          </Link>
        </div>
      </div>
    </div>
  );
}
