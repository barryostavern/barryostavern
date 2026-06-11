interface PlaceholderPageProps {
  title: string;
}

function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div className="text-center py-16">
      <h1 className="text-2xl font-bold mb-4">{title}</h1>
      <p className="text-gray-600">Coming soon</p>
    </div>
  );
}

export default PlaceholderPage;
