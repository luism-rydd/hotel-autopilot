import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const rooms = Array.from({ length: 43 }, (_, i) => ({
  id: i + 1,
  number: `Hab ${i + 1}`,
  status: ['clean', 'dirty', 'occupied'][Math.floor(Math.random() * 3)],
}));

export function RoomsTable() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Habitación</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rooms.map((room) => (
          <TableRow key={room.id}>
            <TableCell>{room.number}</TableCell>
            <TableCell>
              <Badge variant={room.status === 'clean' ? 'default' : 'destructive'}>
                {room.status}
              </Badge>
            </TableCell>
            <TableCell>Check-in</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}