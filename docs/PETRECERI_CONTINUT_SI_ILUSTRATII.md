# Pagina de petreceri

Sursa confirmată: `INTREBARI_PACHET_PETRECERI.md`. Textul editorial și răspunsurile sunt în `public/petreceri.html`. Calculatorul și prețurile extraopțiunilor: `public/petreceri-page.js`.

## Mâncare pentru adulți — demo

Deschide `/petreceri?demo=1` pentru a vedea propunerile demonstrative de componență și porționare. Ele sunt în blocul `data-food-demo` din HTML. Pagina normală afișează blocul `data-food-confirmed`, care cere confirmarea componenței la rezervare. După aprobarea meniurilor, înlocuiește conținutul acestui bloc cu textul final. Prețurile platourilor (250 / 275 lei) provin din oferta existentă.

## Ilustrații pătrate

Fișiere WebP, preferabil 512 × 512 px cu fundal transparent. Pune-le în `public/assets/petreceri/`. Sunt afișate integral, fără crop, la 64–80 px. Până există fișierul, interfața folosește un simbol discret; după adăugare, imaginea se afișează automat.

- `pizza-crispy-suc-meniu-copii.webp`
- `tort-aniversar-lumanare-farfurie.webp`
- `baloane-nume-cifra-invitatie-aniversara.webp`
- `spatiu-joaca-copii-parinti-relaxare.webp`
- `voucher-cadou-o-ora-joaca.webp`
- `platouri-rece-cald-cafea-parinti.webp`
- `animator-personaj-baloane-modelate.webp`
- `magician-joben-stele-copii.webp`
- `decor-masa-tematica-farfurii-baloane.webp`
- `pinata-colorata-dulciuri-jucarii.webp`

Stil: ilustrații simple, un singur grup de obiecte, fără text integrat; culori Becky și contururi lizibile la dimensiune mică. Denumirile descriu subiectele fiecărei ilustrații.
