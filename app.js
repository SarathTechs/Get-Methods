const express = require('express')
const path = require('path')

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'covid19India.db')

let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

const convertDbObjectToResponseObject = dbObject => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
  }
}

app.get('/states/', async (request, response) => {
  const getStatesQuery = `
    SELECT
      *
    FROM
      state
    ORDER BY
      state_id;`
  const statesArray = await db.all(getStatesQuery)
  response.send(
    statesArray.map(eachState => convertDbObjectToResponseObject(eachState))
  )
})

app.get('/states/:stateId/', async (request, response) => {
  const {stateId} = request.params
  const getStateQuery = `
    SELECT
      *
    FROM
      state
    WHERE state_id = ${stateId};`
  const stateArray = await db.get(getStateQuery)
  response.send(
    stateArray.map(eachPlayer => convertDbObjectToResponseObject(eachPlayer))
  )
})

app.post('/districts/', async (request, response) => {
  const districtDetails = request.body
  const {districtName, stateId, cases, cured, active, deaths} = districtDetails
  const addDistrictQuery = `
    INSERT INTO
      district (district_name, state_id, cases, cured, active, deaths)
    VALUES
      (
        '${districtName}',
        ${stateId},
        ${cases},
        ${cured},
        ${active},
        ${deaths}
      );`

  const dbResponse = await db.run(addDistrictQuery)
  response.send('District Successfully Added')
})

app.get('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const getDistrictQuery = `
    SELECT
      *
    FROM
      district
    WHERE district_id = ${districtId};`
  const districtArray = await db.get(getDistrictQuery)
  response.send(
    districtArray.map(eachPlayer =>
      convertDbObjectToResponseObject(eachPlayer)
    )
  )
})

app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const deleteDistrictQuery = `
    DELETE FROM
      district
    WHERE
      district_id = ${districtId};`
  await db.run(deleteDistrictQuery)
  response.send('District Removed')
})

app.put('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const districtDetails = request.body
  const {districtName, stateId, cases, cured, active, deaths} = districtDetails
  const updateDistrictQuery = `
    UPDATE
      district
    SET
      district_name = '${districtName}',
      state_id = ${stateId},
      cases = '${cases}',
      cured = '${cured}',
      active = '${active}',
      deaths = '${deaths}'

    WHERE
      district_id = ${districtId};`
  await db.run(updateDistrictQuery)
  response.send('District Details Updated')
})

app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params
  const getStatisticsQuery = `
    SELECT
      SUM(cases),
      SUM(cured),
      SUM(active),
      SUM(deaths)
    FROM
      district
    WHERE 
      state_id = ${stateId};`
  const stats = await db.get(getStatisticsQuery)
  console.log(stats)

  response.send({
    totalCases: stats['SUM(cases)'],
    totalCured: stats['SUM(cured)'],
    totalActive: stats['SUM(active)'],
    totalDeaths: stats['SUM(deaths)'],
  });
});

app.get('/districts/:districtId/details/', async (request, response) => {
  const {districtId} = request.params
  const getDistrictIdQuery = `
    SELECT
      state_id
    FROM
      district
    WHERE district_id = ${districtId};`
  const districtArrayResponse = await db.get(getDistrictIdQuery)

  const getStateNameQuery = `
  SELECT state_name AS stateName FROM state
  WHERE state_id = ${districtArrayResponse.state_id};`

  const stateArrayResponse = await db.get(getStateNameQuery)
  response.send(stateArrayResponse)
})

module.exports = app
