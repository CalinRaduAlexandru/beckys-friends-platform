(function () {
  const api = (path, options) => (window.adminApiFetch || fetch)(path, options);
  const safe = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[character],
    );
  const dayNames = [
    "Luni",
    "Marți",
    "Miercuri",
    "Joi",
    "Vineri",
    "Sâmbătă",
    "Duminică",
  ];
  const typeLabel = (type) =>
    type === "private"
      ? "Eveniment privat"
      : type === "event"
        ? "Eveniment"
        : type === "closed"
          ? "Închis"
          : "Liber la joacă";
  const typeIcon = (type) =>
    type === "private"
      ? "🔒"
      : type === "event"
        ? "🎈"
        : type === "closed"
          ? "⛔"
          : "🟢";
  const pad = (value) => String(value).padStart(2, "0");
  const localDate = (date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const parseDate = (value) => new Date(`${value}T12:00:00`);
  const mondayOf = (date) => {
    const result = new Date(date);
    const day = result.getDay() || 7;
    result.setDate(result.getDate() - day + 1);
    result.setHours(12, 0, 0, 0);
    return result;
  };
  const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };
  const weekDates = (start) =>
    Array.from({ length: 7 }, (_, index) => localDate(addDays(start, index)));
  const baseHours = (index) =>
    index >= 5 ? ["11:00", "21:00"] : ["15:00", "21:00"];
  const formatRange = (start) => {
    const date = parseDate(start);
    return `${pad(date.getDate())}–${pad(addDays(date, 6).getDate())} ${new Intl.DateTimeFormat("ro-RO", { month: "long" }).format(addDays(date, 6))}`;
  };
  const timeToMinutes = (value) => {
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  };
  const minutesToTime = (value) =>
    `${pad(Math.floor(value / 60))}:${pad(value % 60)}`;

  function buildDayEntries(date, index, entries) {
    const [openStart, openEnd] = baseHours(index);
    const special = entries
      .filter(
        (entry) =>
          entry.date === date &&
          ["private", "event", "closed"].includes(entry.type),
      )
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
    if (!special.length)
      return [
        {
          id: `default-${date}`,
          date,
          type: "open",
          title: "Liber la joacă",
          start_time: openStart,
          end_time: openEnd,
          note: "",
        },
      ];
    const result = [];
    let cursor = timeToMinutes(openStart);
    const end = timeToMinutes(openEnd);
    special.forEach((entry) => {
      const start = Math.max(cursor, timeToMinutes(entry.start_time));
      const finish = Math.min(end, timeToMinutes(entry.end_time));
      if (finish <= start) return;
      if (start > cursor)
        result.push({
          id: `open-${date}-${cursor}`,
          date,
          type: "open",
          title: "Liber la joacă",
          start_time: minutesToTime(cursor),
          end_time: minutesToTime(start),
          note: "",
        });
      result.push({
        ...entry,
        start_time: minutesToTime(start),
        end_time: minutesToTime(finish),
        title: typeLabel(entry.type),
      });
      cursor = finish;
    });
    if (cursor < end)
      result.push({
        id: `open-${date}-${cursor}`,
        date,
        type: "open",
        title: "Liber la joacă",
        start_time: minutesToTime(cursor),
        end_time: openEnd,
        note: "",
      });
    return result;
  }

  const loadCanvasImage = (source) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = source;
    });
  let duckBulletIcon = null;
  let hideDuckIcon = null;
  let happyDuckIcon = null;

  function drawContained(context, image, x, y, width, height) {
    if (!image) return;
    const scale = Math.min(width / image.width, height / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    context.drawImage(
      image,
      x + (width - drawWidth) / 2,
      y + (height - drawHeight) / 2,
      drawWidth,
      drawHeight,
    );
  }

  function drawTintedContained(context, image, x, y, width, height, color) {
    if (!image) return;
    const scale = 2;
    const buffer = document.createElement("canvas");
    buffer.width = Math.ceil(width * scale);
    buffer.height = Math.ceil(height * scale);
    const bufferContext = buffer.getContext("2d");
    drawContained(bufferContext, image, 0, 0, buffer.width, buffer.height);
    bufferContext.globalCompositeOperation = "source-in";
    bufferContext.fillStyle = color;
    bufferContext.fillRect(0, 0, buffer.width, buffer.height);
    context.drawImage(buffer, x, y, width, height);
  }

  function drawThemedContained(context, image, x, y, width, height, color) {
    if (!image) return;
    const scale = 2;
    const buffer = document.createElement("canvas");
    buffer.width = Math.ceil(width * scale);
    buffer.height = Math.ceil(height * scale);
    const bufferContext = buffer.getContext("2d", { willReadFrequently: true });
    drawContained(bufferContext, image, 0, 0, buffer.width, buffer.height);
    const pixels = bufferContext.getImageData(
      0,
      0,
      buffer.width,
      buffer.height,
    );
    const target = color
      .match(/[a-f\d]{2}/gi)
      .map((value) => parseInt(value, 16));
    for (let index = 0; index < pixels.data.length; index += 4) {
      if (!pixels.data[index + 3]) continue;
      const luminance =
        (0.2126 * pixels.data[index] +
          0.7152 * pixels.data[index + 1] +
          0.0722 * pixels.data[index + 2]) /
        255;
      const strength = Math.min(1, Math.max(0, (1 - luminance) / 0.44));
      pixels.data[index] = 255 + (target[0] - 255) * strength;
      pixels.data[index + 1] = 255 + (target[1] - 255) * strength;
      pixels.data[index + 2] = 255 + (target[2] - 255) * strength;
    }
    bufferContext.putImageData(pixels, 0, 0);
    context.drawImage(buffer, x, y, width, height);
  }

  function drawHeart(context, x, y, size, color) {
    context.save();
    context.translate(x, y);
    context.scale(size / 24, size / 24);
    context.beginPath();
    context.moveTo(12, 21);
    context.bezierCurveTo(10, 18, 2, 13, 2, 7);
    context.bezierCurveTo(2, 2, 9, 0, 12, 5);
    context.bezierCurveTo(15, 0, 22, 2, 22, 7);
    context.bezierCurveTo(22, 13, 14, 18, 12, 21);
    context.closePath();
    context.fillStyle = color;
    context.fill();
    context.lineWidth = 1.7;
    context.strokeStyle = "#ffffffcc";
    context.stroke();
    context.restore();
  }

  function drawStar(context, x, y, radius, color) {
    context.save();
    context.translate(x, y);
    context.beginPath();
    for (let point = 0; point < 10; point += 1) {
      const angle = -Math.PI / 2 + (point * Math.PI) / 5;
      const distance = point % 2 ? radius * 0.45 : radius;
      const px = Math.cos(angle) * distance;
      const py = Math.sin(angle) * distance;
      if (!point) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.closePath();
    context.fillStyle = color;
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = "#fff8";
    context.stroke();
    context.restore();
  }

  function drawEntryIcon(context, type, x, y, accent, duckIcon) {
    context.save();
    context.translate(x, y);
    context.lineCap = "round";
    context.lineJoin = "round";
    if (type === "open") {
      context.strokeStyle = accent;
      context.lineWidth = 3.4;
      context.beginPath();
      context.arc(13, 13, 11, 0, Math.PI * 2);
      context.stroke();
      context.beginPath();
      context.moveTo(7, 13);
      context.lineTo(11.5, 17.5);
      context.lineTo(19.5, 8.5);
      context.stroke();
      context.restore();
      return;
    }
    if (type === "closed") {
      context.strokeStyle = "#10264B";
      context.lineWidth = 3;
      context.beginPath();
      context.arc(13, 13, 11, 0, Math.PI * 2);
      context.stroke();
      context.beginPath();
      context.moveTo(8, 8);
      context.lineTo(18, 18);
      context.moveTo(18, 8);
      context.lineTo(8, 18);
      context.stroke();
      context.restore();
      return;
    }
    context.strokeStyle = "#10264B";
    context.fillStyle = "#10264B";
    context.lineWidth = 3;
    context.beginPath();
    context.arc(13, 11, 7, Math.PI, 0);
    context.stroke();
    context.beginPath();
    context.roundRect(4, 11, 18, 14, 4);
    context.fill();
    context.fillStyle = "#fff";
    context.beginPath();
    context.arc(13, 17, 2, 0, Math.PI * 2);
    context.fill();
    context.fillRect(12, 18, 2, 4);
    context.restore();
  }

  function dayCardHeight(day, compact = false) {
    const headerHeight = compact ? 50 : 72;
    const entryHeight = compact ? 44 : 92;
    const gap = compact ? 6 : 12;
    return Math.max(
      compact ? 184 : 174,
      headerHeight +
        day.entries.length * entryHeight +
        Math.max(0, day.entries.length - 1) * gap +
        12,
    );
  }

  function drawDayCard(context, day, index, x, y, width, height, options = {}) {
    const fills = [
      ["#f5fffd", "#d8f0ed"],
      ["#f7faff", "#dae7fa"],
      ["#fbf8ff", "#e9e0f8"],
      ["#fff8fc", "#f7dbea"],
      ["#fff8f8", "#ffdee1"],
      ["#fffaf5", "#ffe5cd"],
      ["#fffdf5", "#fff3cf"],
    ];
    const headerFills = [
      "#c9e7e3",
      "#ccdcf4",
      "#dccdf2",
      "#f0c8de",
      "#f7cbd0",
      "#f8d2b1",
      "#fbe7ad",
    ];
    const accents = [
      "#2aa5a4",
      "#477bcf",
      "#8256d0",
      "#cf4385",
      "#ed5d69",
      "#e77521",
      "#d99d16",
    ];
    const compact = Boolean(options.compact);
    const entryHeight = compact ? 44 : 92;
    const entryGap = compact ? 6 : 12;
    const headerHeight = compact ? 50 : 72;
    const fullDayClosed =
      day.entries.length === 1 && day.entries[0].type === "closed";
    const cardFills = fullDayClosed ? ["#faf9f7", "#eff1f2"] : fills[index];
    const headerFill = fullDayClosed ? "#e6e9eb" : headerFills[index];
    const accent = fullDayClosed ? "#82909c" : accents[index];
    context.save();
    if (fullDayClosed) context.globalAlpha = 0.78;
    context.shadowColor = "#2334492e";
    context.shadowBlur = 21;
    context.shadowOffsetY = 9;
    const gradient = context.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, cardFills[0]);
    gradient.addColorStop(1, cardFills[1]);
    context.fillStyle = gradient;
    context.beginPath();
    context.roundRect(x, y, width, height, 24);
    context.fill();
    context.shadowColor = "transparent";
    context.strokeStyle = `${accent}24`;
    context.lineWidth = 2;
    context.stroke();
    if (!options.noStitch) {
      context.setLineDash([7, 6]);
      context.lineWidth = 2;
      context.strokeStyle = `${accent}58`;
      context.beginPath();
      context.roundRect(x + 8, y + 8, width - 16, height - 16, 18);
      context.stroke();
      context.setLineDash([]);
    }
    context.fillStyle = headerFill;
    context.beginPath();
    context.roundRect(
      x + 2,
      y + 2,
      width - 4,
      headerHeight - 2,
      [22, 22, 0, 0],
    );
    context.fill();
    const glow = context.createRadialGradient(
      x + width * 0.2,
      y + 10,
      4,
      x + width * 0.2,
      y + 10,
      width * 0.72,
    );
    glow.addColorStop(0, "#ffffffb8");
    glow.addColorStop(1, "#ffffff00");
    context.fillStyle = glow;
    context.beginPath();
    context.roundRect(
      x + 2,
      y + 2,
      width - 4,
      headerHeight - 2,
      [22, 22, 0, 0],
    );
    context.fill();
    context.fillStyle = accent;
    context.textAlign = "center";
    context.font = `800 ${compact ? 25 : 35}px 'Quicksand', sans-serif`;
    context.fillText(dayNames[index], x + width / 2, y + (compact ? 34 : 45));
    context.textAlign = "left";
    if (index < 5) {
      drawHeart(context, x + 20, y + 13, compact ? 20 : 24, accent);
      drawHeart(
        context,
        x + width - (compact ? 40 : 46),
        y + 13,
        compact ? 20 : 24,
        accent,
      );
    } else {
      drawStar(context, x + 28, y + 25, compact ? 11 : 13, accent);
      drawStar(context, x + width - 28, y + 25, compact ? 11 : 13, accent);
    }
    if (options.headerBand) {
      context.strokeStyle = `${accent}3d`;
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(x + 1, y + headerHeight);
      context.lineTo(x + width - 1, y + headerHeight);
      context.stroke();
    }
    const fullDayOpen =
      day.entries.length === 1 && day.entries[0].type === "open";
    if (fullDayOpen || fullDayClosed) {
      const entry = day.entries[0];
      const bodyTop = y + headerHeight;
      const bodyHeight = height - headerHeight;
      const iconSize = fullDayClosed ? (compact ? 46 : 62) : compact ? 60 : 82;
      const groupHeight = fullDayClosed ? iconSize : compact ? 78 : 98;
      const groupTop = bodyTop + Math.max(12, (bodyHeight - groupHeight) / 2);
      const stateIcon = fullDayClosed ? hideDuckIcon : happyDuckIcon;
      const narrowCard = width < 360;
      const stateLabel = fullDayClosed ? "Închis" : "Deschis";
      const stateLabelSize = compact ? 19 : 26;
      const timeSize = compact ? (narrowCard ? 24 : 29) : 38;
      context.font = `800 ${stateLabelSize}px 'Quicksand', sans-serif`;
      const labelWidth = context.measureText(stateLabel).width;
      let timeWidth = 0;
      if (!fullDayClosed) {
        context.font = `800 ${timeSize}px 'Quicksand', sans-serif`;
        timeWidth = context.measureText(
          `${entry.start_time} - ${entry.end_time}`,
        ).width;
      }
      const textBlockWidth = Math.max(labelWidth, timeWidth);
      const groupGap = 12;
      const stateGroupWidth = iconSize + groupGap + textBlockWidth;
      const opticalShift = 6;
      const stateGroupX = x + (width - stateGroupWidth) / 2 - opticalShift;
      const stateIconX = stateGroupX;
      const stateIconY = groupTop + (groupHeight - iconSize) / 2;
      if (fullDayClosed)
        drawTintedContained(
          context,
          stateIcon,
          stateIconX,
          stateIconY,
          iconSize,
          iconSize,
          accent,
        );
      else
        drawThemedContained(
          context,
          stateIcon,
          stateIconX,
          stateIconY,
          iconSize,
          iconSize,
          accent,
        );
      const stateTextX = stateGroupX + iconSize + groupGap;
      context.fillStyle = accent;
      context.textAlign = "left";
      context.font = `800 ${stateLabelSize}px 'Quicksand', sans-serif`;
      context.fillText(
        stateLabel,
        stateTextX,
        groupTop + (fullDayClosed ? groupHeight / 2 + 7 : compact ? 28 : 36),
      );
      if (!fullDayClosed) {
        context.font = `800 ${timeSize}px 'Quicksand', sans-serif`;
        context.fillText(
          `${entry.start_time} - ${entry.end_time}`,
          stateTextX,
          groupTop + (compact ? 64 : 82),
        );
      }
      context.textAlign = "left";
      context.restore();
      return;
    }
    const entriesHeight =
      day.entries.length * entryHeight +
      Math.max(0, day.entries.length - 1) * entryGap;
    const availableHeight = height - headerHeight - 12;
    let entryTop =
      y +
      headerHeight +
      (options.centerEntries
        ? Math.max(0, (availableHeight - entriesHeight) / 2)
        : 0);
    day.entries.forEach((entry) => {
      const entryAccent = entry.type === "open" ? accents[index] : "#10264B";
      const entryFill = "#ffffffb8";
      context.fillStyle = entryFill;
      context.beginPath();
      context.roundRect(x + 12, entryTop, width - 24, entryHeight, 12);
      context.fill();
      context.strokeStyle = `${accents[index]}30`;
      context.lineWidth = 1.5;
      context.stroke();
      if (compact) {
        const narrowEntry = width < 360;
        const rowX = x + 18;
        const baseline = entryTop + 29;
        const timeText = `${entry.start_time} - ${entry.end_time}`;
        const entryLabel =
          entry.type === "open" ? "Deschis" : typeLabel(entry.type);
        drawEntryIcon(
          context,
          entry.type,
          rowX,
          entryTop + 8,
          accents[index],
          duckBulletIcon,
        );
        const timeX = rowX + 32;
        context.fillStyle = "#10264B";
        context.font = `800 ${narrowEntry ? 16 : 18}px 'Quicksand', sans-serif`;
        context.fillText(timeText, timeX, baseline);
        const timeWidth = context.measureText(timeText).width;
        context.fillStyle = entryAccent;
        context.font = `700 ${narrowEntry ? 14 : 16}px 'Quicksand', sans-serif`;
        context.fillText(entryLabel, timeX + timeWidth + 9, baseline);
      } else {
        context.fillStyle = "#10264B";
        context.font = `800 30px 'Quicksand', sans-serif`;
        context.fillText(
          `${entry.start_time} - ${entry.end_time}`,
          x + 24,
          entryTop + 33,
        );
        drawEntryIcon(
          context,
          entry.type,
          x + 21,
          entryTop + 43,
          accents[index],
          duckBulletIcon,
        );
        context.fillStyle = "#10264B";
        context.font = `700 28px 'Quicksand', sans-serif`;
        context.fillText(typeLabel(entry.type), x + 53, entryTop + 70);
      }
      entryTop += entryHeight + entryGap;
    });
    context.restore();
  }

  async function createCanvas(weekStart, days) {
    if (document.fonts)
      await Promise.all([
        document.fonts
          .load("700 59px 'DynaPuff'", "Programul săptămânii")
          .catch(() => []),
        document.fonts
          .load(
            "800 35px 'Quicksand'",
            "Luni Marți Miercuri Joi Vineri Sâmbătă Duminică",
          )
          .catch(() => []),
      ]);
    const [
      background,
      logo,
      invitation,
      clouds,
      oneHourIcon,
      twoHourIcon,
      threeHourIcon,
      allDayIcon,
      contactIcon,
      coffeeIcon,
      waterIcon,
      duckIcon,
      hiddenDuckIcon,
      openedDuckIcon,
    ] = await Promise.all([
      loadCanvasImage(
        "/assets/1%20pe%201%20aspect%20ratio%20background.png",
      ).catch(() => null),
      loadCanvasImage("/assets/logo/new_logo_horizontal.png").catch(() => null),
      loadCanvasImage("/assets/te%20asteptam%20cu%20drag_Becky.png").catch(
        () => null,
      ),
      loadCanvasImage("/assets/content_assets/header_clouds.png").catch(
        () => null,
      ),
      loadCanvasImage("/assets/1h_circle.png").catch(() => null),
      loadCanvasImage("/assets/2h_circle.png").catch(() => null),
      loadCanvasImage("/assets/3h_circle.png").catch(() => null),
      loadCanvasImage("/assets/all_day_sun.png").catch(() => null),
      loadCanvasImage("/assets/contact_circled_symbol.png").catch(() => null),
      loadCanvasImage("/assets/cafea.png").catch(() => null),
      loadCanvasImage("/assets/apa.png").catch(() => null),
      loadCanvasImage("/assets/duck_bullet.svg").catch(() => null),
      loadCanvasImage("/assets/hide_duck.svg").catch(() => null),
      loadCanvasImage("/assets/happy_duck.svg").catch(() => null),
    ]);
    duckBulletIcon = duckIcon;
    hideDuckIcon = hiddenDuckIcon;
    happyDuckIcon = openedDuckIcon;
    const naturalHeights = days.map((day) => dayCardHeight(day, true));
    const rowGap = 16;
    const naturalFirstRowHeight = Math.max(
      184,
      naturalHeights[0],
      naturalHeights[1],
    );
    const naturalSecondRowHeight = Math.max(
      184,
      naturalHeights[2],
      naturalHeights[3],
      naturalHeights[4],
    );
    const naturalThirdRowHeight = Math.max(
      184,
      naturalHeights[5],
      naturalHeights[6],
    );
    const firstRowY = 145;
    const footerCardHeight = 210;
    const footerBottom = 1040;
    const footerGap = 22;
    const footerY = footerBottom - footerCardHeight;
    const availableGridHeight = footerY - footerGap - firstRowY;
    const naturalGridHeight =
      naturalFirstRowHeight +
      naturalSecondRowHeight +
      naturalThirdRowHeight +
      rowGap * 2;
    const extraGridSpace = Math.max(0, availableGridHeight - naturalGridHeight);
    const rowStretch = extraGridSpace / 3;
    const firstRowHeight = naturalFirstRowHeight + rowStretch;
    const secondRowHeight = naturalSecondRowHeight + rowStretch;
    const thirdRowHeight =
      naturalThirdRowHeight + extraGridSpace - rowStretch * 2;
    const contentBottom =
      firstRowY +
      firstRowHeight +
      secondRowHeight +
      thirdRowHeight +
      rowGap * 2;
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const context = canvas.getContext("2d");
    if (background)
      context.drawImage(background, 0, 0, canvas.width, canvas.height);
    else {
      const pageGradient = context.createLinearGradient(0, 0, 0, canvas.height);
      pageGradient.addColorStop(0, "#fffdf9");
      pageGradient.addColorStop(0.48, "#fffaf6");
      pageGradient.addColorStop(1, "#fffdf9");
      context.fillStyle = pageGradient;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (logo) context.drawImage(logo, 0, 55, logo.width, 125, 62, 31, 190, 70);
    context.textAlign = "center";
    context.fillStyle = "#10254a";
    context.font = `700 39px 'DynaPuff', 'Quicksand', sans-serif`;
    context.letterSpacing = ".78px";
    context.shadowColor = "#17335320";
    context.shadowBlur = 3;
    context.shadowOffsetY = 3;
    context.fillText("Programul săptămânii", 520, 82);
    context.shadowColor = "transparent";
    context.letterSpacing = "0px";
    const dateLabel = formatRange(localDate(weekStart));
    context.font = `800 23px 'Quicksand', sans-serif`;
    const dateWidth = Math.max(210, context.measureText(dateLabel).width + 42);
    const dateX = 806;
    context.shadowColor = "#c9444b24";
    context.shadowBlur = 10;
    context.shadowOffsetY = 5;
    context.fillStyle = "#fb6268";
    context.beginPath();
    context.roundRect(dateX, 45, dateWidth, 46, 23);
    context.fill();
    context.shadowColor = "transparent";
    context.setLineDash([7, 5]);
    context.strokeStyle = "#fff";
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(dateX + 6, 51, dateWidth - 12, 34, 17);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = "#fff";
    context.fillText(dateLabel, dateX + dateWidth / 2, 75);
    context.textAlign = "left";
    drawHeart(context, 42, 119, 24, "#fb7176");
    drawStar(context, 1024, 117, 18, "#ffb116");
    const outerX = 52;
    const innerWidth = 976;
    const twoGap = 28;
    const twoWidth = (innerWidth - twoGap) / 2;
    const threeGap = 24;
    const threeWidth = (innerWidth - threeGap * 2) / 3;
    const cardOptions = {
      compact: true,
      centerEntries: true,
      headerBand: true,
    };
    drawDayCard(
      context,
      days[0],
      0,
      outerX,
      firstRowY,
      twoWidth,
      firstRowHeight,
      cardOptions,
    );
    drawDayCard(
      context,
      days[1],
      1,
      outerX + twoWidth + twoGap,
      firstRowY,
      twoWidth,
      firstRowHeight,
      cardOptions,
    );
    const secondRowY = firstRowY + firstRowHeight + rowGap;
    [2, 3, 4].forEach((dayIndex, columnIndex) =>
      drawDayCard(
        context,
        days[dayIndex],
        dayIndex,
        outerX + columnIndex * (threeWidth + threeGap),
        secondRowY,
        threeWidth,
        secondRowHeight,
        cardOptions,
      ),
    );
    const thirdRowY = secondRowY + secondRowHeight + rowGap;
    drawDayCard(
      context,
      days[5],
      5,
      outerX,
      thirdRowY,
      twoWidth,
      thirdRowHeight,
      cardOptions,
    );
    drawDayCard(
      context,
      days[6],
      6,
      outerX + twoWidth + twoGap,
      thirdRowY,
      twoWidth,
      thirdRowHeight,
      cardOptions,
    );
    const footerCardWidth = threeWidth;
    const pricingX = outerX;
    context.save();
    context.shadowColor = "#23344920";
    context.shadowBlur = 16;
    context.shadowOffsetY = 7;
    context.fillStyle = "#ffffffed";
    context.beginPath();
    context.roundRect(pricingX, footerY, footerCardWidth, footerCardHeight, 22);
    context.fill();
    context.shadowColor = "transparent";
    context.strokeStyle = "#9ed4d7";
    context.lineWidth = 1.5;
    context.stroke();
    context.restore();
    const priceGap = 7;
    const priceWidth = (footerCardWidth - 20 - priceGap * 2) / 3;
    const prices = [
      ["1h", "30 LEI", "#1397a2", oneHourIcon],
      ["2h", "50 LEI", "#f2a20d", twoHourIcon],
      ["3h", "70 LEI", "#6546a8", threeHourIcon],
    ];
    prices.forEach((price, index) => {
      const x = pricingX + 10 + index * (priceWidth + priceGap);
      const y = footerY + 11;
      context.fillStyle = "#fff";
      context.shadowColor = "#23344916";
      context.shadowBlur = 7;
      context.shadowOffsetY = 3;
      context.beginPath();
      context.roundRect(x, y, priceWidth, 126, 9);
      context.fill();
      context.shadowColor = "transparent";
      context.strokeStyle = `${price[2]}55`;
      context.lineWidth = 1.2;
      context.stroke();
      context.fillStyle = price[2];
      context.fillRect(x, y + 119, priceWidth, 7);
      drawContained(
        context,
        price[3],
        x + (priceWidth - 44) / 2,
        y + 7,
        44,
        44,
      );
      context.fillStyle = price[2];
      context.textAlign = "center";
      context.font = `700 24px 'DynaPuff', 'Quicksand', sans-serif`;
      context.letterSpacing = ".56px";
      context.fillText(price[0], x + priceWidth / 2, y + 75);
      context.letterSpacing = "0px";
      context.fillStyle = "#10264B";
      context.font = `800 21px 'Quicksand', sans-serif`;
      context.fillText(price[1], x + priceWidth / 2, y + 108);
      context.textAlign = "left";
    });
    const contactY = footerY + footerCardHeight - 68;
    context.fillStyle = "#fff";
    context.beginPath();
    context.roundRect(pricingX + 10, contactY, footerCardWidth - 20, 58, 14);
    context.fill();
    context.strokeStyle = "#9ed4d7";
    context.lineWidth = 1.2;
    context.stroke();
    const contactIconSize = 38;
    const contactIconGap = 5;
    const contactTextGap = 6;
    const contactLabel = "Rezervări:";
    const contactPhone = "0752 155 115";
    const contactLabelSize = 15;
    const contactPhoneSize = 17;
    context.font = `900 ${contactLabelSize}px 'Quicksand', sans-serif`;
    const contactLabelWidth = context.measureText(contactLabel).width;
    context.font = `700 ${contactPhoneSize}px 'Quicksand', sans-serif`;
    const contactPhoneWidth = context.measureText(contactPhone).width;
    const contactGroupWidth =
      contactIconSize +
      contactIconGap +
      contactLabelWidth +
      contactTextGap +
      contactPhoneWidth;
    const contactGroupX = pricingX + (footerCardWidth - contactGroupWidth) / 2;
    const contactX = contactGroupX + contactIconSize + contactIconGap;
    const contactBaseline = contactY + 36;
    drawContained(
      context,
      contactIcon,
      contactGroupX,
      contactY + 10,
      contactIconSize,
      contactIconSize,
    );
    context.fillStyle = "#10264B";
    context.strokeStyle = "#10264B";
    context.textAlign = "left";
    context.font = `900 ${contactLabelSize}px 'Quicksand', sans-serif`;
    context.lineWidth = 1.2;
    context.strokeText(contactLabel, contactX, contactBaseline);
    context.fillText(contactLabel, contactX, contactBaseline);
    context.font = `700 ${contactPhoneSize}px 'Quicksand', sans-serif`;
    context.fillText(
      contactPhone,
      contactX + contactLabelWidth + contactTextGap,
      contactBaseline,
    );
    const allDayX = outerX + threeWidth + threeGap;
    const bandHeight = 100;
    context.save();
    context.shadowColor = "#23344926";
    context.shadowBlur = 16;
    context.shadowOffsetY = 7;
    context.fillStyle = "#fff";
    context.beginPath();
    context.roundRect(allDayX, footerY, footerCardWidth, footerCardHeight, 22);
    context.fill();
    context.shadowColor = "transparent";
    context.strokeStyle = "#eb5e62";
    context.lineWidth = 3;
    context.stroke();
    context.fillStyle = "#ed6165";
    context.beginPath();
    context.roundRect(
      allDayX + 2,
      footerY + footerCardHeight - bandHeight - 2,
      footerCardWidth - 4,
      bandHeight,
      [0, 0, 20, 20],
    );
    context.fill();
    context.restore();
    const allDayCenterX = allDayX + footerCardWidth / 2;
    const sunCenterX = allDayX + 54;
    const sunCenterY = footerY + 52;
    context.fillStyle = "#ed6165";
    context.beginPath();
    context.arc(sunCenterX, sunCenterY, 34, 0, Math.PI * 2);
    context.fill();
    drawContained(
      context,
      allDayIcon,
      sunCenterX - 46,
      sunCenterY - 46,
      92,
      92,
    );
    const offerCenterX = allDayX + footerCardWidth * 0.64;
    const offerY = footerY + 68;
    context.textAlign = "left";
    context.letterSpacing = ".6px";
    context.font = `700 24px 'DynaPuff', 'Quicksand', sans-serif`;
    const allDayLabel = "ALL DAY";
    const allDayLabelWidth = context.measureText(allDayLabel).width;
    context.letterSpacing = "0px";
    context.font = `800 25px 'Quicksand', sans-serif`;
    const allDayPrice = " - 90 LEI";
    const allDayPriceWidth = context.measureText(allDayPrice).width;
    let offerX = offerCenterX - (allDayLabelWidth + allDayPriceWidth) / 2;
    context.fillStyle = "#ed6165";
    context.font = `700 24px 'DynaPuff', 'Quicksand', sans-serif`;
    context.letterSpacing = ".6px";
    context.fillText(allDayLabel, offerX, offerY);
    offerX += allDayLabelWidth;
    context.letterSpacing = "0px";
    context.fillStyle = "#10264B";
    context.font = `800 25px 'Quicksand', sans-serif`;
    context.fillText(allDayPrice, offerX, offerY);
    const includeTop = footerY + footerCardHeight - bandHeight;
    context.fillStyle = "#fff";
    context.textAlign = "center";
    context.font = `800 19px 'Quicksand', sans-serif`;
    context.fillText(
      "Inclus: 1 cafea + 1 apă 0,5L",
      allDayCenterX,
      includeTop + 31,
    );
    const drinkIconSize = 35;
    const drinkGap = 13;
    const plusWidth = 14;
    const drinksWidth = drinkIconSize * 2 + drinkGap * 2 + plusWidth;
    const drinksX = allDayCenterX - drinksWidth / 2;
    const drinksY = includeTop + 52;
    drawContained(
      context,
      coffeeIcon,
      drinksX,
      drinksY,
      drinkIconSize,
      drinkIconSize,
    );
    context.fillStyle = "#fff";
    context.font = `800 21px 'Quicksand', sans-serif`;
    context.fillText(
      "+",
      drinksX + drinkIconSize + drinkGap + plusWidth / 2,
      drinksY + 25,
    );
    drawContained(
      context,
      waterIcon,
      drinksX + drinkIconSize + drinkGap * 2 + plusWidth,
      drinksY,
      drinkIconSize,
      drinkIconSize,
    );
    context.textAlign = "left";
    const invitationX = outerX + 2 * (threeWidth + threeGap);
    if (invitation)
      drawContained(
        context,
        invitation,
        invitationX - 4,
        footerY - 8,
        footerCardWidth + 8,
        footerCardHeight + 28,
      );
    return canvas;
  }

  async function renderCalendarAdmin() {
    const demo = document.getElementById("workspace-demo");
    if (!demo) return;
    document.body.dataset.workspace = "calendar";
    document.querySelector(".workspace")?.classList.add("hidden");
    document.getElementById("css-workspace")?.classList.add("hidden");
    document.getElementById("empty")?.classList.add("hidden");
    document.getElementById("editor")?.classList.add("hidden");
    document
      .querySelector(".top-actions")
      ?.classList.add("overview-actions-hidden");
    document
      .querySelectorAll(".sidebar .side-link")
      .forEach((link) =>
        link.classList.toggle("active", link.href.includes("view=calendar")),
      );
    document.querySelector(".topbar h1").textContent = "Calendar Becky";
    document.querySelector(".topbar .subtitle").textContent =
      "Construiește rapid programul public pentru săptămâna aleasă.";
    demo.className = "workspace-demo calendar-admin-workspace";
    demo.classList.remove("hidden");
    demo.innerHTML =
      '<div class="calendar-admin-loading">Se încarcă săptămâna…</div>';
    let allEntries = [];
    try {
      const response = await api("/api/admin/calendar");
      if (!response.ok) throw new Error();
      allEntries = (await response.json()).entries || [];
    } catch {
      demo.innerHTML =
        '<div class="calendar-admin-empty">Calendarul nu este disponibil momentan.</div>';
      return;
    }
    const todayMonday = mondayOf(new Date());
    const nextMonday = addDays(todayMonday, 7);
    let weekStart = nextMonday;
    let activeDays = [];
    const saveWeek = async (days) => {
      const entries = days.flatMap((day) =>
        day.entries
          .filter((entry) => entry.type !== "open")
          .map((entry) => ({
            ...entry,
            id:
              entry.id.startsWith("default-") || entry.id.startsWith("open-")
                ? crypto.randomUUID()
                : entry.id,
          })),
      );
      const response = await api("/api/admin/calendar/week", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week_start: localDate(weekStart), entries }),
      });
      if (!response.ok) throw new Error();
      allEntries = [
        ...allEntries.filter(
          (entry) => !weekDates(weekStart).includes(entry.date),
        ),
        ...((await response.json()).entries || []),
      ];
    };
    const render = () => {
      const dates = weekDates(weekStart);
      activeDays = dates.map((date, index) => ({
        date,
        index,
        entries: buildDayEntries(date, index, allEntries),
      }));
      const currentActive = localDate(weekStart) === localDate(todayMonday);
      const nextActive = localDate(weekStart) === localDate(nextMonday);
      demo.innerHTML = `<div class="calendar-planner-head"><div><span class="eyebrow">PROGRAM BECKY · V1</span><h2>Disponibilitatea săptămânii</h2><p>Modifici doar evenimentele; intervalele libere se calculează automat.</p></div><div class="calendar-planner-actions"><button class="calendar-nav ${currentActive ? "is-active" : ""}" data-calendar-current>Săptămâna în curs</button><button class="calendar-nav ${nextActive ? "is-active" : ""}" data-calendar-next>Săptămâna următoare</button><button class="primary" data-calendar-preview>Preview</button></div></div><div class="calendar-week-label"><button data-calendar-prev aria-label="Săptămâna anterioară">←</button><strong>${safe(formatRange(localDate(weekStart)))}</strong><button data-calendar-forward aria-label="Săptămâna următoare">→</button></div><div class="calendar-day-grid">${activeDays.map((day) => `<article class="calendar-day-card"><header><div><small>${dayNames[day.index]}</small><strong>${safe(day.date)}</strong></div><span>${day.entries.length} intervale</span></header><div class="calendar-segments">${day.entries.map((entry) => `<div class="calendar-segment calendar-segment-${entry.type}"><span>${typeIcon(entry.type)}</span><div><strong>${safe(entry.start_time)} - ${safe(entry.end_time)}</strong><small>${safe(typeLabel(entry.type))}</small></div>${entry.type === "open" ? "" : `<div class="calendar-segment-actions"><button type="button" data-calendar-edit="${safe(entry.id)}" data-calendar-date="${day.date}">Editează</button><button type="button" data-calendar-delete="${safe(entry.id)}" data-calendar-date="${day.date}">Șterge</button></div>`}</div>`).join("")}</div><div class="calendar-day-actions"><button data-calendar-add="event" data-calendar-date="${day.date}">＋ Eveniment</button><button data-calendar-add="private" data-calendar-date="${day.date}">＋ Eveniment privat</button><button data-calendar-add="closed" data-calendar-date="${day.date}">＋ Închis</button><button class="calendar-reset" data-calendar-reset="${day.date}">Resetează ziua</button></div></article>`).join("")}</div><div class="calendar-planner-footer"><span data-calendar-status>Modificările se salvează automat.</span><button class="primary" data-calendar-preview>Vezi preview-ul săptămânii</button></div><section class="calendar-preview-panel hidden" data-calendar-preview-panel><div class="calendar-preview-head"><div><span class="eyebrow">PREVIEW PENTRU POSTARE</span><h3>Programul săptămânii</h3></div><div><button class="calendar-nav" data-calendar-back>← Înapoi la editare</button><button class="primary" data-calendar-download>Descarcă imaginea</button></div></div><div class="calendar-preview-canvas" data-calendar-canvas></div></section>`;
      const status = (text) => {
        const node = demo.querySelector("[data-calendar-status]");
        if (node) node.textContent = text;
      };
      const openModal = (type, date, existing = null) => {
        const modal = document.createElement("div");
        const dayIndex = dates.indexOf(date);
        const selectedType = existing?.type || type;
        modal.className = "calendar-interval-modal";
        modal.innerHTML = `<form class="calendar-interval-card"><div><span class="eyebrow">${safe(dayNames[dayIndex])}</span><h3>${existing ? "Editează intervalul" : safe(typeLabel(selectedType))}</h3><p>Alege intervalul. Restul zilei rămâne automat „Liber la joacă”.</p></div>${existing ? `<label>Tip<select name="type"><option value="event" ${selectedType === "event" ? "selected" : ""}>Eveniment</option><option value="private" ${selectedType === "private" ? "selected" : ""}>Eveniment privat</option><option value="closed" ${selectedType === "closed" ? "selected" : ""}>Închis</option></select></label>` : ""}<label>De la<input name="start_time" type="time" required value="${safe(existing?.start_time || baseHours(dayIndex)[0])}"></label><label>Până la<input name="end_time" type="time" required value="${safe(existing?.end_time || baseHours(dayIndex)[1])}"></label><div class="calendar-interval-actions"><button type="button" class="calendar-nav" data-modal-close>Anulează</button><button class="primary">${existing ? "Salvează modificarea" : "Adaugă interval"}</button></div></form>`;
        document.body.appendChild(modal);
        modal.querySelector("[data-modal-close]").onclick = () =>
          modal.remove();
        modal.querySelector("form").onsubmit = async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const start = form.get("start_time");
          const end = form.get("end_time");
          const effectiveType = form.get("type") || selectedType;
          const [baseStart, baseEnd] = baseHours(dayIndex);
          if (start < baseStart || end > baseEnd || start >= end) return;
          const current = activeDays.find((day) => day.date === date);
          const specials = current.entries.filter(
            (entry) =>
              ["private", "event", "closed"].includes(entry.type) &&
              entry.id !== existing?.id,
          );
          if (
            specials.some(
              (entry) => start < entry.end_time && end > entry.start_time,
            )
          )
            return;
          const updatedEntry = {
            id: existing?.id || crypto.randomUUID(),
            date,
            type: effectiveType,
            title: typeLabel(effectiveType),
            start_time: start,
            end_time: end,
            note: existing?.note || "",
          };
          activeDays[dayIndex].entries = buildDayEntries(date, dayIndex, [
            ...specials,
            updatedEntry,
          ]);
          try {
            await saveWeek(activeDays);
            modal.remove();
            render();
          } catch {
            status("Nu am putut salva modificarea.");
          }
        };
      };
      demo.querySelector("[data-calendar-current]").onclick = () => {
        weekStart = todayMonday;
        render();
      };
      demo.querySelector("[data-calendar-next]").onclick = () => {
        weekStart = nextMonday;
        render();
      };
      demo.querySelector("[data-calendar-prev]").onclick = () => {
        weekStart = addDays(weekStart, -7);
        render();
      };
      demo.querySelector("[data-calendar-forward]").onclick = () => {
        weekStart = addDays(weekStart, 7);
        render();
      };
      demo
        .querySelectorAll("[data-calendar-add]")
        .forEach(
          (button) =>
            (button.onclick = () =>
              openModal(
                button.dataset.calendarAdd,
                button.dataset.calendarDate,
              )),
        );
      demo.querySelectorAll("[data-calendar-edit]").forEach(
        (button) =>
          (button.onclick = () => {
            const day = activeDays.find(
              (item) => item.date === button.dataset.calendarDate,
            );
            const entry = day?.entries.find(
              (item) => item.id === button.dataset.calendarEdit,
            );
            if (entry) openModal(entry.type, day.date, entry);
          }),
      );
      demo.querySelectorAll("[data-calendar-delete]").forEach(
        (button) =>
          (button.onclick = async () => {
            const day = activeDays.find(
              (item) => item.date === button.dataset.calendarDate,
            );
            const entry = day?.entries.find(
              (item) => item.id === button.dataset.calendarDelete,
            );
            if (
              !day ||
              !entry ||
              !window.confirm(
                `Ștergi intervalul ${entry.start_time} - ${entry.end_time}?`,
              )
            )
              return;
            day.entries = buildDayEntries(
              day.date,
              day.index,
              day.entries.filter((item) => item.id !== entry.id),
            );
            try {
              await saveWeek(activeDays);
              render();
            } catch {
              status("Nu am putut salva modificarea.");
            }
          }),
      );
      demo.querySelectorAll("[data-calendar-reset]").forEach(
        (button) =>
          (button.onclick = async () => {
            const day = activeDays.find(
              (item) => item.date === button.dataset.calendarReset,
            );
            if (!day) return;
            day.entries = buildDayEntries(day.date, day.index, []);
            try {
              await saveWeek(activeDays);
              render();
            } catch {
              status("Nu am putut salva modificarea.");
            }
          }),
      );
      const showPreview = async () => {
        const panel = demo.querySelector("[data-calendar-preview-panel]");
        const canvasHost = demo.querySelector("[data-calendar-canvas]");
        panel.classList.remove("hidden");
        canvasHost.innerHTML =
          '<div class="calendar-admin-loading">Se pregătește imaginea…</div>';
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
        const canvas = await createCanvas(weekStart, activeDays);
        canvasHost.replaceChildren(canvas);
        demo.querySelector("[data-calendar-download]").onclick = () => {
          const link = document.createElement("a");
          link.download = `program-becky-${localDate(weekStart)}.png`;
          link.href = canvas.toDataURL("image/png");
          link.click();
        };
        demo.querySelector("[data-calendar-back]").onclick = () =>
          panel.classList.add("hidden");
      };
      demo
        .querySelectorAll("[data-calendar-preview]")
        .forEach((button) => (button.onclick = showPreview));
    };
    render();
  }
  window.renderCalendarAdmin = renderCalendarAdmin;
})();
