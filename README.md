# Craft Beer Viz

> Amerikai kézműves sör vizualizáció.

## Megtekintés

A vizualizáció megtekintése a következő módokon lehetséges:

  * a http://craft-beer-viz.surge.sh/ oldalon, 
  * a http://battila7.github.io/craft-beer-viz oldalon,
  * az `npm install` parancsot követően, az `npm run serve` parancs elindít egy kiszolgálót, mely a `127.0.0.1:8080` címen teszi elérhetővé a vizualizációt, 
  * a `docs\index.html` állomány böngészőben történő megnyitásával.

## Magyarázat

A térképen azt láthatjuk, hogy mely államban melyik a legtöbbet főzött nemzetiségi (azaz nem amerikai) sör. Minél élénkebb egy állam, annál többet főznek ott az adott nemzetiségi sörből.

Például, ha belga sört szeretnénk inni, akkor Michigant érdemes választanunk, hiszen

  * egy belga zászlóval van kitöltve, ami azt jelenti, hogy itt belga a legtöbbet főzött nemzetiségi sör,
  * a belga zászlós államok közül a legélénkebb, tehát itt főzik a legtöbb különböző belga sört.
  
A piros pontok azokat a városokat jelölik, ahol a zászlónak megfelelő nemzetiségű sört főznek.

Egy államra kattintva részletes adatokat is megtekinthetünk. Ekkor a fekete pontok azokat a városokat jelölik, melyekben a zászlónak megfelelő nemzetiségű sört **nem** főznek. A piros pontok értelmezése azonos.

A pontok fölé húzva az egeret, megjelenik az adott város neve. Ha egy pontra rákattintunk, akkor a jobb oldali panelen az adott városban főzött söröket láthatjuk.

## Adatfeldolgozás

A vizualizáció alapjául szolgáló adatokat Jean-Nicholas Hould tette elérhetővée a [Craft Beers Dataset](https://github.com/nickhould/craft-beers-dataset) tárolóban. Ez két CSV fájlt jelent:
  * [`beers.csv`](dataset/original/beers.csv),
  * [`breweries.csv`](dataset/original/breweries.csv)
  
Az említett CSV fájlokból egy többlépcsős csővezeték (melynek szkriptjei a `dataset` mappában találhatók) JSON kimenetet készít. A feldolgozás legfontosabb lépései a következők:

  1. A CSV állományok ekvivalens (azonos tartalmú) JSON fájllá konvertálása.
  1. A Google Maps API segítségével koordináták hozzárendelése a sörfőzdéknek otthont adó településekhez.
  1. A sörök adatainak beágyazása a sörfőzdéket leíró rekordokba. Ez a `beers.csv` és a `breweries.csv` adatainak egy állományba olvasztását jelenti.
  1. A sörök típus és nemzetiség szerinti csoportosítása. A csoportokat a `dataset\original` mappában található `type-map..json` és `nationality-map.json` állományok írják le.
  1. Az egyes államokban legtöbbet főzött nemzetiség, valamint az adott nemzetiségnek otthont adó városok meghatározása.
  
A feldolgozás végén előálló fájl `docs\data\dataset.json` néven található meg.

## Megjelenítés

Az adatok megjelenítéséről a `docs` mappában található állományok gondoskodnak.

### index.html

Az `index.html` egy héjat jelent, amit dinamikusan töltünk meg az adatokból képzett elemekkel. A `us-map` osztályú elem tartalmazza a nagy térképet, míg az éppen kijelölt állam majd a `map-container` osztályú elemben fog megjelenni. A `state-details` osztályú elem fogja tartalmazni a kijelölt állam adatait (név, főzdék, sörök).

### main.js - preloading-worker.js

A `main.js` a D3 SVG kirajzolásának belépési pontja. Ez egy `mainIIFE` nevű `immediately-invoked function expression`-t tartalmaz, mely a `DOMContentLoaded` esemény bekövetkeztekor a következőket teszi:

  * inicializálja a Materialize segítségével képzett elemeket és az eseménykezelőket,
  * amennyiben szükséges, megjeleníti a cookie-hozzájárulásról szóló ablakot (pedig már nem is használ cookie-kat az oldal, csak egy korábbi verzió használt),
  * megjeleníti az előtöltő-ablakot.
  
Az adatok betöltése egy Web Workerben történik, melyet a `preloading-worker.js` szkript ír le. Erre azért van szükség, hogy ne blokkoljuk a UI szálat. Az előtöltés három fázisból áll:
 
   * a tényleges adatállomány betöltése,
   * az államokat leíró poligonok betöltése,
   * a sörfőzdék logóinak beolvasása.
   
Az előtöltő ablak az adatállomány és a poligonok betöltése alatt jelenik meg, hiszen addig nem lehetséges a térkép kirajzolása. Később a sörfőzdék logóinak betöltése a háttérben történik, emiatt lehetséges, hogy ezek nem jelennek meg az első pillanattól fogva.

A következőkben a vizualizáció érdekesebb pontjait emelem ki.

#### Kitöltés zászlóval

Az Egyesült Államokat adó államok zászlókkal vannak kitöltve. Az emögött álló kód a `main.js` 447. sorától kezdve olvasható. Ennek lényege, hogy először zászló nélkül, szürke színnel rajzolunk ki minden államot, hogy ismerjük a bounding boxuk méreteit. Ezt követően minden egyes államhoz (melyhez ismerjük a legtöbbet főzött nemzetiséget) létrehozunk egy patternt, mely a kitöltésről fog gondoskodni. A patternbe egy image kerül, mely pontosan akkora méretű lesz, mint az adott állam bounding boxa. Az adott zászlót leíró kép image-en belüli megfelelő pozicionálásáról és skálázásáról a `preserveAspectRatio` attribútum értéke gondoskodik.

##### Állam megjelenítése lentről felfelé animációval

Ha egy államra kattintunk, akkor az nagyban is megjelenik, egy animáció kíséretében. Az animáció részleteit leíró kód a `main.js` 303. sorában kezdődik. Az animáció egy téglalap mozgatását jelenti. Ez a téglalap azonban egy clipPath-on belül található, aminek köszönhetően csak az jelenik meg, ami a téglalap takarásában van. Minél feljebb mozog ez a téglalap, annál több lesz látható az államból, míg a többi rész átlátszó marad.

Az animációval párhuzamosan egy hangeffektus is hallható, a lejátszás és leállítás részleteit a `main.js` állomány 327. sorától kezdve találjuk.
