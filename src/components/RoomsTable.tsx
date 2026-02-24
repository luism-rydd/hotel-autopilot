import type { Database } from '@/lib/types';

type Room = Database['public']['Tables']['rooms']['Row'];

type RoomsTableProps = {
  rooms: Room[];
};

export function RoomsTable({ rooms }: RoomsTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Room</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Capacity</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((room) => (
            <tr key={room.id} className="border-t border-slate-100">
              <td className="px-4 py-3">{room.name}</td>
              <td className="px-4 py-3">{room.status}</td>
              <td className="px-4 py-3">{room.capacity}</td>
            </tr>
          ))}
          {rooms.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-5 text-center text-slate-500">
                No rooms available.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
