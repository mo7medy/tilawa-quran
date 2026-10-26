import { StudioCatalog } from './contracts';

const backgroundSelection = (catalog: StudioCatalog, first: string): string[] => {
  const selected = catalog.backgrounds.find((image) => image.id === first);
  if (selected?.type !== 'image') return [];
  return [
    first,
    ...catalog.backgrounds
      .filter(
        (image) =>
          image.id !== first &&
          image.type === 'image' &&
          image.orientation === selected.orientation &&
          image.collection === selected.collection,
      )
      .slice(0, 3)
      .map((image) => image.id),
  ];
};
export default backgroundSelection;
