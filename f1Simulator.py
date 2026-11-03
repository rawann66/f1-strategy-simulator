import os


class Driver:

  def __init__(self, name, team, tireSkill, consistency):
    self.name = name
    self.team = team
    self.tireSkill = float(tireSkill)
    self.consistency = float(consistency)


class Team:

  def __init__(self, team, baseBase, avgPit):
    self.team = team
    self.baseBase = float(baseBase)
    self.avgPit = float(avgPit)


class Circuit:

  def __init__(
      self, circuitname, baselapTime, totalLaps, tireWear, BasePitStop
  ):
    self.circuitname = circuitname
    self.baselapTime = float(baselapTime)
    self.totalLaps = int(float(totalLaps))
    self.tireWear = float(tireWear)
    self.BasePitStop = float(BasePitStop)


class Strategy:

  def __init__(self, startTyre, pitTyre, pitlap):
    self.startTyre = startTyre
    self.pitTyre = pitTyre
    self.pitlap = int(float(pitlap))


def open_data_file(filename):
  """Checks data/ folder first, then falls back to root directory."""
  paths = [os.path.join("data", filename), filename]
  for p in paths:
    if os.path.exists(p):
      return open(p, "r", encoding="utf-8")
  print(f"Error: Could not find {filename} in 'data/' or root directory.")
  return None


def upload_drivers(filename="drivers.txt"):
  drivers = []
  f = open_data_file(filename)
  if not f:
    return drivers
  with f:
    for line in f:
      line = line.strip()
      if not line:
        continue
      parts = line.split(",")
      if len(parts) >= 4:
        drivers.append(Driver(parts[0], parts[1], parts[2], parts[3]))
  return drivers


def upload_teams(filename="teams.txt"):
  teams = []
  f = open_data_file(filename)
  if not f:
    return teams
  with f:
    for line in f:
      line = line.strip()
      if not line:
        continue
      parts = line.split(",")
      if len(parts) >= 3:
        teams.append(Team(parts[0], parts[1], parts[2]))
  return teams


def upload_circuits(filename="circuits.txt"):
  circuits = []
  f = open_data_file(filename)
  if not f:
    return circuits
  with f:
    for line in f:
      line = line.strip()
      if not line:
        continue
      parts = line.split(",")
      if len(parts) >= 5:
        circuits.append(
            Circuit(parts[0], parts[1], parts[2], parts[3], parts[4])
        )
  return circuits


def upload_strategy(filename="pitstrategy.txt"):
  strategies = []
  f = open_data_file(filename)
  if not f:
    return strategies
  with f:
    for line in f:
      line = line.strip()
      if not line:
        continue
      parts = line.split(",")
      if len(parts) >= 3:
        strategies.append(Strategy(parts[0][0], parts[1][0], parts[2]))
  return strategies


def all_simulation(d, team, circuit):
  current_initial_delta = 0.45
  current_base_deg = 0.09
  pit_lap = circuit.totalLaps // 2

  total_lap_time = 0.0
  pit_loss = 0.0
  local_tyre_counter = 0

  for l in range(1, circuit.totalLaps + 1):
    local_tyre_counter += 1
    if pit_lap == l:
      local_tyre_counter = 0
      pit_loss = circuit.BasePitStop + team.avgPit
      current_base_deg = 0.01
      current_initial_delta = 0.95

    lap_time = (
        circuit.baselapTime
        + team.baseBase
        + current_initial_delta
        + (local_tyre_counter * current_base_deg * d.tireSkill)
    )
    total_lap_time += lap_time + pit_loss

  return [{
      "drivername": d.name,
      "teamname": d.team,
      "totallaptime": total_lap_time,
  }]


def main():
  drivers = upload_drivers("drivers.txt")
  teams_list = upload_teams("teams.txt")
  circuits_list = upload_circuits("circuits.txt")
  strategies = upload_strategy("pitstrategy.txt")

  if not drivers or not teams_list or not circuits_list:
    print("Error: Could not load required data files.")
    return

  userteam = teams_list[0]
  userdriver = drivers[0]
  usercircuit = circuits_list[0]
  userstrategy = strategies[0] if strategies else Strategy("M", "H", 10)

  tyrecounter = 0
  total_laptime = 0.0

  for l in range(1, usercircuit.totalLaps + 1):
    pitstoploss = 0.0
    if tyrecounter == userstrategy.pitlap:
      tyrecounter = 0
      pitstoploss = usercircuit.BasePitStop + userteam.avgPit

    active_tyre = (
        userstrategy.startTyre if tyrecounter == 0 else userstrategy.pitTyre
    )

    if active_tyre == "S":
      initial_delta, base_deg_rate = 0.00, 0.18
    elif active_tyre == "M":
      initial_delta, base_deg_rate = 0.45, 0.09
    else:
      initial_delta, base_deg_rate = 0.95, 0.01

    tyrecounter += 1
    lap_time = (
        usercircuit.baselapTime
        + userteam.baseBase
        + initial_delta
        + (tyrecounter * base_deg_rate * userdriver.tireSkill)
    )
    total_laptime += lap_time + pitstoploss

  final_standings = []
  user_result = {
      "drivername": userdriver.name,
      "teamname": userdriver.team,
      "totallaptime": total_laptime,
  }
  final_standings.append(user_result)

  for d in drivers:
    if d.name == userdriver.name:
      continue

    dteam = teams_list[0]
    for t in teams_list:
      if t.team == d.team:
        dteam = t
        break

    ai_res = all_simulation(d, dteam, usercircuit)
    final_standings.append(ai_res[0])

  final_standings.sort(key=lambda x: x["totallaptime"])
  lead_time = final_standings[0]["totallaptime"]

  with open("driversStanding.txt", "w", encoding="utf-8") as race_standings:
    for i, entry in enumerate(final_standings):
      pos = i + 1
      if i == 0:
        race_standings.write(
            f"{pos} {entry['drivername']} {entry['teamname']}"
            f" {entry['totallaptime']}\n"
        )
      else:
        gap = entry["totallaptime"] - lead_time
        race_standings.write(
            f"{pos} {entry['drivername']} {entry['teamname']}  +{gap:.3f}\n"
        )

  print("Simulation executed successfully! 'driversStanding.txt' updated.")


if __name__ == "__main__":
  main()